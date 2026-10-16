package com.thyroai.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AIScoreRepository extends JpaRepository<AIScore, UUID> {
    Optional<AIScore> findByExaminationId(UUID examinationId);
}
