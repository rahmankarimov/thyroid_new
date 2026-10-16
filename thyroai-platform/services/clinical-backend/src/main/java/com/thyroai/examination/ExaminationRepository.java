package com.thyroai.examination;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ExaminationRepository extends JpaRepository<Examination, UUID> {
    List<Examination> findByPatientId(UUID patientId);
    long countByStatus(String status);

    @Query(value = "SELECT e.id FROM examinations e " +
                   "WHERE e.status = 'PENDING_REVIEW' " +
                   "AND NOT EXISTS (SELECT 1 FROM tirads_results tr WHERE tr.examination_id = e.id AND tr.created_by = :userId) " +
                   "AND (SELECT COUNT(*) FROM tirads_results tr2 WHERE tr2.examination_id = e.id) < 3 " +
                   "ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Optional<UUID> findNextRandomForRating(@Param("userId") UUID userId);
}
