package com.thyroai.hospital.dto;

import lombok.Data;

@Data
public class HospitalFeatureGrantDTO {
    private boolean grantAiSuggestion;
    private boolean grantPathologyInput;
    private boolean grantAnnotationTool;
    private boolean grantViewAnnotations;
    private boolean grantImageGallery;
}
