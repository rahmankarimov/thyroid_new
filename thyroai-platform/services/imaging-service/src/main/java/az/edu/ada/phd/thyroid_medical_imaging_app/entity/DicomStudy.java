package az.edu.ada.phd.thyroid_medical_imaging_app.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dicom_studies")

@NoArgsConstructor
@AllArgsConstructor
@Getter
public class DicomStudy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String orthancStudyId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public DicomStudy(String orthancStudyId){
        this.orthancStudyId = orthancStudyId;
    }
}