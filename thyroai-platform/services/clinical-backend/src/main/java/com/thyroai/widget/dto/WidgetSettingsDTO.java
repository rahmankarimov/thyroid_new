package com.thyroai.widget.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WidgetSettingsDTO {
    private boolean showAISuggestion;
    private boolean showPathologyInput;
    private boolean showAnnotationTool;
    private boolean showViewAnnotations;
    private boolean showImageGallery;
    private boolean showTiradsCalculator;
}
