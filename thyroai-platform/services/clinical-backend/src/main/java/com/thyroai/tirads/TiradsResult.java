package com.thyroai.tirads;

import com.thyroai.examination.Examination;
import com.thyroai.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tirads_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TiradsResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id", nullable = false)
    private Examination examination;

    @Column(name = "total_points", nullable = false)
    private int totalPoints;

    @Column(nullable = false, length = 20)
    private String level;

    @Column(length = 50)
    private String composition;

    @Column(length = 50)
    private String echogenicity;

    @Column(length = 50)
    private String shape;

    @Column(length = 50)
    private String margin;

    @Column(name = "echogenic_foci")
    private String echogenicFoci;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
