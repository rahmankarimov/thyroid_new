package com.thyroai.retraining;

import com.thyroai.pathology.PathologyResult;
import com.thyroai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "retraining_batches")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"approvedBy", "pathologyResults"})
@ToString(exclude = {"approvedBy", "pathologyResults"})
public class RetrainingBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Builder.Default
    private LocalDateTime approvedAt = LocalDateTime.now();

    private int caseCount;

    @Builder.Default
    private String status = "PENDING_TRAINING";

    @ManyToMany
    @JoinTable(name = "batch_pathology_results",
            joinColumns = @JoinColumn(name = "batch_id"),
            inverseJoinColumns = @JoinColumn(name = "pathology_result_id"))
    @Builder.Default
    private List<PathologyResult> pathologyResults = new ArrayList<>();
}
