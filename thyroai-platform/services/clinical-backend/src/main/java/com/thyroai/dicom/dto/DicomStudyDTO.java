package com.thyroai.dicom.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class DicomStudyDTO {
    private UUID id;
    private String orthancStudyId;
    private String studyInstanceUid;
    private String accessionNumber;
    private LocalDate studyDate;
    private String studyDescription;
    private String modality;

    private String dicomPatientId;
    private String dicomPatientName;
    private LocalDate dicomBirthDate;
    private String dicomSex;
    private String sourceAeTitle;
    private String institutionName;

    private String status;
    private String unmatchedReason;

    private UUID hospitalId;
    private String hospitalName;
    private UUID patientId;
    private String patientName;
    private UUID examinationId;

    private LocalDateTime receivedAt;
    private LocalDateTime resolvedAt;
    private String resolvedBy;

    private int instanceCount;
    private List<DicomInstanceDTO> instances;
}
