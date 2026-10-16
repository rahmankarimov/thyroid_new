package com.thyroai.dicom;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DicomStudyRepository extends JpaRepository<DicomStudy, UUID> {

    Optional<DicomStudy> findByOrthancStudyId(String orthancStudyId);

    Optional<DicomStudy> findByStudyInstanceUid(String studyInstanceUid);

    Page<DicomStudy> findByHospital_IdAndStatus(UUID hospitalId, DicomIngestStatus status, Pageable pageable);

    Page<DicomStudy> findByHospital_Id(UUID hospitalId, Pageable pageable);

    Page<DicomStudy> findByStatus(DicomIngestStatus status, Pageable pageable);

    /**
     * Studies that never resolved to a hospital (unknown AE Title). They belong to no
     * tenant, so only a super admin can see them.
     */
    Page<DicomStudy> findByHospitalIsNullAndStatus(DicomIngestStatus status, Pageable pageable);
}
