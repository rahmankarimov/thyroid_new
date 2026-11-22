package com.thyroai.ratingqueue;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "image_reservations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageReservation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "examination_id", nullable = false)
    private UUID examinationId;

    @Column(name = "clinician_id", nullable = false)
    private UUID clinicianId;

    @Column(name = "reserved_at", nullable = false)
    private LocalDateTime reservedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, EXPIRED, RELEASED
}
