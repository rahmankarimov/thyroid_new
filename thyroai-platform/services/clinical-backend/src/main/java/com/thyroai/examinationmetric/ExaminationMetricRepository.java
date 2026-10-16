package com.thyroai.examinationmetric;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExaminationMetricRepository extends JpaRepository<ExaminationMetric, UUID> {
    List<ExaminationMetric> findByExaminationIdOrderByCreatedAtAsc(UUID examinationId);
    List<ExaminationMetric> findByPatientIdOrderByCreatedAtAsc(UUID patientId);
}
