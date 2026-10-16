package com.thyroai.user;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_permissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    @Builder.Default
    private boolean canAnnotate = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean canViewAnnotations = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean canSubmitDiagnosis = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean canSeeAi = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean canSeeGallery = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean mustChangePassword = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean canSeePatients = false;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
