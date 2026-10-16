package com.thyroai.retraining;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RetrainingBatchRepository extends JpaRepository<RetrainingBatch, UUID> {
}
