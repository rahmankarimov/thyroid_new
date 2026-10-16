package com.thyroai.examinationmetric;

import com.thyroai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "examination_metrics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "doctor")
@ToString(exclude = "doctor")
public class ExaminationMetric {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "uuid")
    private UUID examinationId;

    @Column(nullable = false, columnDefinition = "uuid")
    private UUID patientId;

    @Column(name = "metric_key", nullable = false)
    private String metricKey;

    @Column(name = "metric_value", nullable = false)
    private String metricValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User doctor;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
