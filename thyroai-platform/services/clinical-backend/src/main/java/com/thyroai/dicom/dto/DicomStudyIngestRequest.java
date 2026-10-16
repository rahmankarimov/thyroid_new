package com.thyroai.dicom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * The {@code study} part of a multipart POST to /api/v1/dicom/ingest — the DICOM
 * identity of one study plus a manifest of its instances. The preview JPEGs travel
 * alongside as repeated {@code preview} parts, matched by {@code previewFilename}.
 */
@Data
public class DicomStudyIngestRequest {

    @NotBlank
    private String orthancStudyId;

    @NotBlank
    private String studyInstanceUid;

    private String accessionNumber;
    private LocalDate studyDate;
    private String studyDescription;
    private String modality;

    private String sourceAeTitle;
    private String institutionName;

    private String dicomPatientId;
    private String dicomPatientName;
    private LocalDate dicomBirthDate;
    private String dicomSex;

    private List<DicomInstanceIngestRequest> instances = new ArrayList<>();
}
