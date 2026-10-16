package com.thyroai.dicom;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A single image within a {@link DicomStudy}.
 *
 * <p>{@code previewUrl} points at ThyroAI's own storage (Cloudinary or /images) — the
 * pipeline's object store is private and the panels render images with a plain
 * {@code <img src>}. {@code archiveObjectKey} is the breadcrumb back to the original
 * full-fidelity .dcm.
 */
@Entity
@Table(name = "dicom_instances")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "study")
@ToString(exclude = "study")
public class DicomInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dicom_study_id", nullable = false)
    private DicomStudy study;

    @Column(name = "orthanc_instance_id", nullable = false, unique = true, length = 64)
    private String orthancInstanceId;

    private String seriesDescription;

    private Integer instanceNumber;

    @Column(length = 2000)
    private String previewUrl;

    @Column(length = 512)
    private String archiveObjectKey;

    /** Set once this instance has been materialised into an Examination. */
    @Column(name = "image_series_id", columnDefinition = "uuid")
    private UUID imageSeriesId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
