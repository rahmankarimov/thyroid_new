package az.edu.ada.phd.thyroid_medical_imaging_app.repository;

import az.edu.ada.phd.thyroid_medical_imaging_app.entity.DicomStudy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DicomStudyRepository extends JpaRepository<DicomStudy, UUID> {
    Optional<DicomStudy> findByOrthancStudyId(String orthancStudyId);
}