package az.edu.ada.phd.thyroid_medical_imaging_app.repository;

import az.edu.ada.phd.thyroid_medical_imaging_app.entity.DicomInstance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DicomInstanceRepository extends JpaRepository<DicomInstance, UUID> {
    boolean existsByOrthancInstanceId(String orthancInstanceId);
}