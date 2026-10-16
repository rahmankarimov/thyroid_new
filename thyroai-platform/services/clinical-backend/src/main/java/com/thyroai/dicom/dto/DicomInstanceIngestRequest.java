package com.thyroai.dicom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DicomInstanceIngestRequest {

    @NotBlank
    private String orthancInstanceId;

    private String seriesDescription;
    private Integer instanceNumber;

    /** Object key of the original .dcm in the pipeline's archive. */
    private String archiveObjectKey;

    /** Filename of the matching {@code preview} multipart part; null if no preview exists. */
    private String previewFilename;
}
