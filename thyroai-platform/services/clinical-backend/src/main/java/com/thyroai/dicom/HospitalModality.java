package com.thyroai.dicom;

import com.thyroai.hospital.Hospital;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A registered DICOM device (ultrasound machine) belonging to a hospital.
 *
 * <p>The calling AE Title is how an incoming study is attributed to a tenant —
 * it is configured on the physical machine and cannot be mistyped by an operator,
 * unlike InstitutionName.
 */
@Entity
@Table(name = "hospital_modalities")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "hospital")
@ToString(exclude = "hospital")
public class HospitalModality {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hospital_id", nullable = false)
    private Hospital hospital;

    @Column(name = "ae_title", nullable = false, unique = true, length = 16)
    private String aeTitle;

    @Column(name = "station_name", length = 64)
    private String stationName;

    private String description;

    @Builder.Default
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
