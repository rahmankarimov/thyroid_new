package com.thyroai.pathology;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PathologyRepository extends JpaRepository<PathologyResult, UUID> {
    Optional<PathologyResult> findByExaminationId(UUID examinationId);
    List<PathologyResult> findByApprovedForRetrainingFalse();
    long countByApprovedForRetrainingFalse();
}
