package com.thyroai.hospital.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class HospitalDTO {
    private UUID          id;
    private String        name;
    private String        code;
    private boolean       active;
    private boolean       grantAiSuggestion;
    private boolean       grantPathologyInput;
    private boolean       grantAnnotationTool;
    private boolean       grantViewAnnotations;
    private boolean       grantImageGallery;
    private LocalDateTime createdAt;
    private int           userCount;
}
