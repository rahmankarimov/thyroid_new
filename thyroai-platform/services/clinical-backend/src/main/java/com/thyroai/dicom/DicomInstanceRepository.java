package com.thyroai.dicom;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DicomInstanceRepository extends JpaRepository<DicomInstance, UUID> {

    boolean existsByOrthancInstanceId(String orthancInstanceId);

    List<DicomInstance> findByStudy_IdOrderByInstanceNumberAsc(UUID studyId);
}
