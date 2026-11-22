package com.thyroai.ratingqueue;

import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.user.User;
import com.thyroai.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thyroai.ratingqueue.dto.QueueNextResponse;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingQueueService {

    private final ExaminationRepository examinationRepository;
    private final UserRepository userRepository;
    private final ImageReservationRepository reservationRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${thyroai.allocation.reservation-timeout-minutes:3}")
    private int reservationTimeoutMinutes;

    @Transactional
    public QueueNextResponse getNextRandomExaminationId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User clinician = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        UUID clinicianId = clinician.getId();
        LocalDateTime now = LocalDateTime.now();

        // 1. Expire outdated reservations first
        reservationRepository.expireStaleReservations(now);

        // 2. Check if this clinician already has an active, valid reservation (session resume)
        Optional<ImageReservation> activeRes = reservationRepository.findActiveByClinician(clinicianId, now);
        if (activeRes.isPresent()) {
            ImageReservation r = activeRes.get();
            UUID examId = r.getExaminationId();
            Examination exam = examinationRepository.findById(examId)
                    .orElseThrow(() -> new IllegalArgumentException("Reserved exam not found"));
            long remaining = Math.max(0, ChronoUnit.SECONDS.between(now, r.getExpiresAt()));
            return QueueNextResponse.builder()
                    .patientId(exam.getPatient().getId())
                    .examId(examId)
                    .remainingSeconds(remaining)
                    .expiresAt(r.getExpiresAt().toString())
                    .build();
        }

        // 3. Phase 1: Fixed Common Initial Pool (I0)
        // Check if there are common pool images not yet completed by this clinician
        List<?> pendingCommonPool = entityManager.createNativeQuery(
                "SELECT CAST(e.id AS text) FROM examinations e " +
                "WHERE e.is_common_pool = TRUE " +
                "AND NOT EXISTS (" +
                "    SELECT 1 FROM tirads_results tr WHERE tr.examination_id = e.id AND tr.created_by = :clinicianId" +
                ") " +
                "ORDER BY e.examination_date ASC, RANDOM() LIMIT 1")
                .setParameter("clinicianId", clinicianId)
                .getResultList();

        if (!pendingCommonPool.isEmpty()) {
            UUID selectedExamId = UUID.fromString((String) pendingCommonPool.get(0));
            ImageReservation res = createReservation(selectedExamId, clinicianId, now);
            Examination exam = examinationRepository.findById(selectedExamId).orElseThrow();
            long remaining = Math.max(0, ChronoUnit.SECONDS.between(now, res.getExpiresAt()));
            return QueueNextResponse.builder()
                    .patientId(exam.getPatient().getId())
                    .examId(selectedExamId)
                    .remainingSeconds(remaining)
                    .expiresAt(res.getExpiresAt().toString())
                    .build();
        }

        // 4. Phase 2: Stratified Main Batches (Asynchronous Progression)
        int currentBatch = getClinicianCurrentBatch(clinicianId);
        int maxBatch = getMaxBatchIndex();

        for (int b = currentBatch; b <= maxBatch; b++) {
            UUID allocatedId = tryAllocateFromBatch(b, clinicianId, now);
            if (allocatedId != null) {
                if (b != currentBatch) {
                    updateClinicianBatch(clinicianId, b);
                }
                ImageReservation res = createReservation(allocatedId, clinicianId, now);
                Examination exam = examinationRepository.findById(allocatedId).orElseThrow();
                long remaining = Math.max(0, ChronoUnit.SECONDS.between(now, res.getExpiresAt()));
                return QueueNextResponse.builder()
                        .patientId(exam.getPatient().getId())
                        .examId(allocatedId)
                        .remainingSeconds(remaining)
                        .expiresAt(res.getExpiresAt().toString())
                        .build();
            }
        }

        throw new IllegalArgumentException("Bütün mövcud şəkillər tamamlanıb və ya hovuzda boş yer qalmayıb!");
    }

    private UUID tryAllocateFromBatch(int batchIndex, UUID clinicianId, LocalDateTime now) {
        String sql =
            "WITH candidate_images AS (" +
            "    SELECT " +
            "        e.id, " +
            "        (SELECT COUNT(1) FROM tirads_results tr WHERE tr.examination_id = e.id) AS a_count, " +
            "        (SELECT COUNT(1) FROM image_reservations ir WHERE ir.examination_id = e.id AND ir.status = 'ACTIVE' AND ir.expires_at > :now) AS r_count " +
            "    FROM examinations e " +
            "    WHERE e.is_common_pool = FALSE " +
            "      AND e.batch_index = :batchIndex " +
            "      AND NOT EXISTS (" +
            "          SELECT 1 FROM tirads_results tr WHERE tr.examination_id = e.id AND tr.created_by = :clinicianId" +
            "      )" +
            "), " +
            "eligible_images AS (" +
            "    SELECT id, a_count " +
            "    FROM candidate_images " +
            "    WHERE (a_count + r_count) < 3" +
            "), " +
            "ranked_images AS (" +
            "    SELECT " +
            "        ei.id, " +
            "        ei.a_count, " +
            "        CASE " +
            "            WHEN ei.a_count = 2 THEN (" +
            "                SELECT COALESCE(COUNT(DISTINCT other_tr.examination_id), 0) " +
            "                FROM tirads_results other_tr " +
            "                WHERE other_tr.created_by = :clinicianId " +
            "                  AND other_tr.examination_id IN (" +
            "                      SELECT tr_exist.examination_id FROM tirads_results tr_exist " +
            "                      WHERE tr_exist.created_by IN (" +
            "                          SELECT tr_sub.created_by FROM tirads_results tr_sub WHERE tr_sub.examination_id = ei.id" +
            "                      )" +
            "                  )" +
            "            ) " +
            "            WHEN ei.a_count = 1 THEN (" +
            "                SELECT COALESCE(COUNT(DISTINCT other_tr.examination_id), 0) " +
            "                FROM tirads_results other_tr " +
            "                WHERE other_tr.created_by = :clinicianId " +
            "                  AND other_tr.examination_id IN (" +
            "                      SELECT tr_exist.examination_id FROM tirads_results tr_exist " +
            "                      WHERE tr_exist.created_by = (" +
            "                          SELECT tr_sub.created_by FROM tirads_results tr_sub WHERE tr_sub.examination_id = ei.id LIMIT 1" +
            "                      )" +
            "                  )" +
            "            ) " +
            "            ELSE 0 " +
            "        END AS combination_freq " +
            "    FROM eligible_images ei " +
            ") " +
            "SELECT CAST(ri.id AS text) " +
            "FROM ranked_images ri " +
            "JOIN examinations e_lock ON e_lock.id = ri.id " +
            "ORDER BY ri.a_count DESC, ri.combination_freq ASC, RANDOM() " +
            "LIMIT 1 " +
            "FOR UPDATE OF e_lock SKIP LOCKED";

        List<?> results = entityManager.createNativeQuery(sql)
                .setParameter("batchIndex", batchIndex)
                .setParameter("clinicianId", clinicianId)
                .setParameter("now", now)
                .getResultList();

        if (results.isEmpty()) {
            return null;
        }
        return UUID.fromString((String) results.get(0));
    }

    private ImageReservation createReservation(UUID examId, UUID clinicianId, LocalDateTime now) {
        ImageReservation res = ImageReservation.builder()
                .examinationId(examId)
                .clinicianId(clinicianId)
                .reservedAt(now)
                .expiresAt(now.plusMinutes(reservationTimeoutMinutes))
                .status("ACTIVE")
                .build();
        return reservationRepository.save(res);
    }

    private int getClinicianCurrentBatch(UUID clinicianId) {
        List<?> rows = entityManager.createNativeQuery(
                "SELECT current_batch FROM clinician_batch_progress WHERE clinician_id = :id")
                .setParameter("id", clinicianId)
                .getResultList();
        if (rows.isEmpty()) {
            return 1;
        }
        return ((Number) rows.get(0)).intValue();
    }

    private void updateClinicianBatch(UUID clinicianId, int newBatch) {
        entityManager.createNativeQuery(
                "INSERT INTO clinician_batch_progress (clinician_id, current_batch, updated_at) " +
                "VALUES (:id, :batch, NOW()) " +
                "ON CONFLICT (clinician_id) DO UPDATE SET current_batch = :batch, updated_at = NOW()")
                .setParameter("id", clinicianId)
                .setParameter("batch", newBatch)
                .executeUpdate();
    }

    private int getMaxBatchIndex() {
        List<?> rows = entityManager.createNativeQuery(
                "SELECT COALESCE(MAX(batch_index), 1) FROM examinations WHERE is_common_pool = FALSE")
                .getResultList();
        if (rows.isEmpty() || rows.get(0) == null) {
            return 1;
        }
        return ((Number) rows.get(0)).intValue();
    }
}
