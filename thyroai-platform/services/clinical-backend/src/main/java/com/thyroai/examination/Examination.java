package com.thyroai.examination;

import com.thyroai.ai.AIScore;
import com.thyroai.imageseries.ImageSeries;
import com.thyroai.patient.Patient;
import com.thyroai.pathology.PathologyResult;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "examinations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"patient", "imageSeries", "aiScore", "pathologyResult"})
@ToString(exclude = {"patient", "imageSeries", "aiScore", "pathologyResult"})
public class Examination {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(nullable = false)
    private LocalDate examinationDate;

    @Builder.Default
    private String status = "PENDING_REVIEW";

    /** MANUAL when an admin uploaded the images, DICOM when a UZI device sent the study. */
    @Builder.Default
    private String source = "MANUAL";

    @OneToMany(mappedBy = "examination", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ImageSeries> imageSeries = new ArrayList<>();

    @OneToOne(mappedBy = "examination", cascade = CascadeType.ALL, orphanRemoval = true)
    private AIScore aiScore;

    @OneToOne(mappedBy = "examination", cascade = CascadeType.ALL, orphanRemoval = true)
    private PathologyResult pathologyResult;
}
