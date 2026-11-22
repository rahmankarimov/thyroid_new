package com.thyroai.ratingqueue;

import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.ratingqueue.dto.QueueNextResponse;
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

    @Value("${thyroai.allocation.reservation-timeout-seconds:180}")
    private int reservationTimeoutSeconds;

    @Transactional
    public QueueNextResponse getNextRandomExaminationId() {
        return getNextRandomExaminationId(false);
    }

    @Transactional
    public QueueNextResponse getNextRandomExaminationId(boolean expireCurrent) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User clinician = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        UUID clinicianId = clinician.getId();

        // Serialize concurrent requests for the same clinician (e.g. React StrictMode double-mount)
        entityManager.createNativeQuery("SELECT CAST(id AS text) FROM users WHERE id = :id FOR UPDATE")
                .setParameter("id", clinicianId)
                .getResultList();

        LocalDateTime now = LocalDateTime.now();

        // 1. Expire outdated reservations globally
        reservationRepository.expireStaleReservations(now);

        // If the frontend timer hit 0:00 and requested expiration of the current reservation:
        if (expireCurrent) {
            reservationRepository.expireActiveByClinician(clinicianId);
            entityManager.flush();
        }

        // 2. Check if this clinician already has an active, valid reservation (session resume)
        List<ImageReservation> activeList = reservationRepository.findActiveByClinician(clinicianId, now);
        if (!activeList.isEmpty()) {
            ImageReservation r = activeList.get(0);
            // Clean up any stale duplicates if they ever existed
            if (activeList.size() > 1) {
                for (int i = 1; i < activeList.size(); i++) {
                    ImageReservation dup = activeList.get(i);
                    dup.setStatus("RELEASED");
                    reservationRepository.save(dup);
                }
                entityManager.flush();
            }

            UUID examId = r.getExaminationId();
            Optional<Examination> examOpt = examinationRepository.findById(examId);
            if (examOpt.isPresent() && isStillEligibleForClinician(examOpt.get(), clinicianId)) {
                Examination exam = examOpt.get();
                long remaining = Math.max(1, ChronoUnit.SECONDS.between(now, r.getExpiresAt()));
                return QueueNextResponse.builder()
                        .patientId(exam.getPatient().getId())
                        .examId(examId)
                        .remainingSeconds(remaining)
                        .expiresAt(r.getExpiresAt().toString())
                        .build();
            } else {
                r.setStatus("COMPLETED");
                reservationRepository.save(r);
                entityManager.flush();
            }
        }

        // 3. Phase 1: Fixed Common Initial Pool (I0)
        // Every newly registered clinician must complete all k images in I0 before main pool allocation
        List<?> pendingCommonPool = entityManager.createNativeQuery(
                "SELECT CAST(e.id AS text) FROM examinations e " +
                "JOIN patients p ON p.id = e.patient_id " +
                "WHERE e.is_common_pool = TRUE " +
                "AND NOT EXISTS (" +
                "    SELECT 1 FROM tirads_results tr WHERE tr.examination_id = e.id AND tr.created_by = :clinicianId" +
                ") " +
                "ORDER BY p.fin ASC, e.examination_date ASC LIMIT 1")
                .setParameter("clinicianId", clinicianId)
                .getResultList();

        if (!pendingCommonPool.isEmpty()) {
            UUID selectedExamId = UUID.fromString((String) pendingCommonPool.get(0));
            ImageReservation res = createReservation(selectedExamId, clinicianId, now);
            Examination exam = examinationRepository.findById(selectedExamId).orElseThrow();
            long remaining = Math.max(1, ChronoUnit.SECONDS.between(now, res.getExpiresAt()));
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

        // Forward progression from clinician's current batch b(c) up to m
        for (int b = currentBatch; b <= maxBatch; b++) {
            UUID allocatedId = tryAllocateFromBatch(b, clinicianId, now);
            if (allocatedId != null) {
                if (b != currentBatch) {
                    updateClinicianBatch(clinicianId, b);
                }
                ImageReservation res = createReservation(allocatedId, clinicianId, now);
                Examination exam = examinationRepository.findById(allocatedId).orElseThrow();
                long remaining = Math.max(1, ChronoUnit.SECONDS.between(now, res.getExpiresAt()));
                return QueueNextResponse.builder()
                        .patientId(exam.getPatient().getId())
                        .examId(allocatedId)
                        .remainingSeconds(remaining)
                        .expiresAt(res.getExpiresAt().toString())
                        .build();
            }
        }

        // Backfill check: if earlier batches (1 .. currentBatch - 1) have newly freed slots
        // (e.g., due to another clinician's expired reservation after this clinician advanced), complete them!
        for (int b = 1; b < currentBatch; b++) {
            UUID allocatedId = tryAllocateFromBatch(b, clinicianId, now);
            if (allocatedId != null) {
                ImageReservation res = createReservation(allocatedId, clinicianId, now);
                Examination exam = examinationRepository.findById(allocatedId).orElseThrow();
                long remaining = Math.max(1, ChronoUnit.SECONDS.between(now, res.getExpiresAt()));
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

    @Transactional
    public void releaseCurrentReservation() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByEmail(email).ifPresent(clinician -> {
            reservationRepository.releaseActiveByClinician(clinician.getId());
        });
    }

    private boolean isStillEligibleForClinician(Examination exam, UUID clinicianId) {
        Number alreadyDone = (Number) entityManager.createNativeQuery(
                "SELECT COUNT(1) FROM tirads_results tr WHERE tr.examination_id = :examId AND tr.created_by = :clinicianId")
                .setParameter("examId", exam.getId())
                .setParameter("clinicianId", clinicianId)
                .getSingleResult();
        if (alreadyDone.longValue() > 0) {
            return false;
        }
        if (!exam.isCommonPool()) {
            Number totalDone = (Number) entityManager.createNativeQuery(
                    "SELECT COUNT(1) FROM tirads_results tr WHERE tr.examination_id = :examId")
                    .setParameter("examId", exam.getId())
                    .getSingleResult();
            return totalDone.longValue() < 3;
        }
        return true;
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
            "                SELECT COUNT(1) " +
            "                FROM examinations e_other " +
            "                WHERE e_other.is_common_pool = FALSE " +
            "                  AND EXISTS (" +
            "                      SELECT 1 FROM tirads_results tr_c " +
            "                      WHERE tr_c.examination_id = e_other.id AND tr_c.created_by = :clinicianId" +
            "                  ) " +
            "                  AND (" +
            "                      SELECT COUNT(DISTINCT tr_xy.created_by) " +
            "                      FROM tirads_results tr_xy " +
            "                      WHERE tr_xy.examination_id = e_other.id " +
            "                        AND tr_xy.created_by IN (" +
            "                            SELECT tr_exist.created_by FROM tirads_results tr_exist WHERE tr_exist.examination_id = ei.id" +
            "                        ) " +
            "                        AND tr_xy.created_by <> :clinicianId" +
            "                  ) = 2" +
            "            ) " +
            "            WHEN ei.a_count = 1 THEN (" +
            "                SELECT COUNT(1) " +
            "                FROM examinations e_other " +
            "                WHERE e_other.is_common_pool = FALSE " +
            "                  AND EXISTS (" +
            "                      SELECT 1 FROM tirads_results tr_c " +
            "                      WHERE tr_c.examination_id = e_other.id AND tr_c.created_by = :clinicianId" +
            "                  ) " +
            "                  AND EXISTS (" +
            "                      SELECT 1 FROM tirads_results tr_x " +
            "                      WHERE tr_x.examination_id = e_other.id " +
            "                        AND tr_x.created_by IN (" +
            "                            SELECT tr_exist.created_by FROM tirads_results tr_exist WHERE tr_exist.examination_id = ei.id" +
            "                        ) " +
            "                        AND tr_x.created_by <> :clinicianId" +
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
        // Ensure no lingering active reservation exists for this clinician before inserting
        reservationRepository.releaseActiveByClinician(clinicianId);
        entityManager.flush();

        ImageReservation res = ImageReservation.builder()
                .examinationId(examId)
                .clinicianId(clinicianId)
                .reservedAt(now)
                .expiresAt(now.plusSeconds(reservationTimeoutSeconds))
                .status("ACTIVE")
                .build();
        return reservationRepository.saveAndFlush(res);
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
