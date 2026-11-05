package com.thyroai.examination;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExaminationRepository extends JpaRepository<Examination, UUID> {
    List<Examination> findByPatientId(UUID patientId);
    long countByStatus(String status);

    @Query(value = "SELECT CAST(e.id AS text) FROM examinations e " +
                   "WHERE e.status = 'PENDING_REVIEW' " +
                   "AND NOT EXISTS (SELECT 1 FROM tirads_results tr WHERE tr.examination_id = e.id AND tr.created_by = CAST(:userId AS uuid)) " +
                   "AND (SELECT COUNT(1) FROM tirads_results tr2 WHERE tr2.examination_id = e.id) < 3 " +
                   "ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Optional<String> findNextRandomForRating(@Param("userId") String userId);
}
