package az.edu.ada.phd.thyroid_medical_imaging_app.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dicom_instances")

@NoArgsConstructor
@AllArgsConstructor
@Getter
public class DicomInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    private DicomStudy study;

    @Column(nullable = false, unique = true)
    private String orthancInstanceId;

    @Column(nullable = false)
    private String dicomObjectKey;

    private String previewObjectKey;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public DicomInstance(
            DicomStudy study,
            String orthancInstanceId,
            String dicomObjectKey,
            String previewObjectKey,
            LocalDateTime createdAt) {
        this.study = study;
        this.orthancInstanceId = orthancInstanceId;
        this.dicomObjectKey = dicomObjectKey;
        this.previewObjectKey = previewObjectKey;
        this.createdAt = createdAt;
    }
}
