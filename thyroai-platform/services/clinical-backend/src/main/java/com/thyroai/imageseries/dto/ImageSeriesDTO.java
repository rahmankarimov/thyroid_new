package com.thyroai.imageseries.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ImageSeriesDTO {
    private UUID id;
    private UUID examinationId;
    private String label;
    private String thumbnailUrl;
    private String fullUrl;
}
