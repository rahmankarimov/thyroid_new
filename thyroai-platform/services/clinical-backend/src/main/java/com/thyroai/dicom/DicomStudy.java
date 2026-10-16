package com.thyroai.dicom;

import com.thyroai.examination.Examination;
import com.thyroai.hospital.Hospital;
import com.thyroai.patient.Patient;
import com.thyroai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A DICOM study received from the imaging pipeline.
 *
 * <p>Holds the raw DICOM identity verbatim so an admin can reconcile an unmatched
 * study by eye, plus the resolution outcome once it is attached to a patient.
 */
@Entity
@Table(name = "dicom_studies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"instances", "hospital", "patient", "examination", "resolvedBy"})
@ToString(exclude = {"instances", "hospital", "patient", "examination", "resolvedBy"})
public class DicomStudy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "orthanc_study_id", nullable = false, unique = true, length = 64)
    private String orthancStudyId;

    @Column(name = "study_instance_uid", nullable = false, unique = true, length = 128)
    private String studyInstanceUid;

    @Column(name = "accession_number", length = 64)
    private String accessionNumber;

    private LocalDate studyDate;
    private String studyDescription;

    @Column(length = 16)
    private String modality;

    // --- raw DICOM identity ---
    @Column(name = "dicom_patient_id", length = 64)
    private String dicomPatientId;

    @Column(name = "dicom_patient_name")
    private String dicomPatientName;

    @Column(name = "dicom_birth_date")
    private LocalDate dicomBirthDate;

    @Column(name = "dicom_sex", length = 16)
    private String dicomSex;

    @Column(name = "source_ae_title", length = 16)
    private String sourceAeTitle;

    private String institutionName;

    // --- resolution outcome ---
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DicomIngestStatus status = DicomIngestStatus.UNMATCHED;

    private String unmatchedReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id")
    private Examination examination;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    private LocalDateTime resolvedAt;

    @Builder.Default
    private LocalDateTime receivedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "study", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<DicomInstance> instances = new ArrayList<>();
}
