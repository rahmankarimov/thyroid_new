package com.thyroai.dicom;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HospitalModalityRepository extends JpaRepository<HospitalModality, UUID> {

    /** Resolves an incoming study's calling AE Title to its registered device. */
    Optional<HospitalModality> findByAeTitleIgnoreCaseAndActiveTrue(String aeTitle);

    Optional<HospitalModality> findByAeTitleIgnoreCase(String aeTitle);

    List<HospitalModality> findByHospital_Id(UUID hospitalId);
}
