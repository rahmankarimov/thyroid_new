package com.thyroai.dicom.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class DicomInstanceDTO {
    private UUID id;
    private String orthancInstanceId;
    private String seriesDescription;
    private Integer instanceNumber;
    private String previewUrl;
    private UUID imageSeriesId;
}
