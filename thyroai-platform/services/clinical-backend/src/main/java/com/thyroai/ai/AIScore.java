package com.thyroai.ai;

import com.thyroai.examination.Examination;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_scores")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "examination")
@ToString(exclude = "examination")
public class AIScore {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id")
    private Examination examination;

    @Column(nullable = false)
    private Double malignancyProbability;

    @Column(nullable = false)
    private String tiradsScore;

    @Column(length = 2000)
    private String justification;

    @Builder.Default
    private LocalDateTime generatedAt = LocalDateTime.now();
}
