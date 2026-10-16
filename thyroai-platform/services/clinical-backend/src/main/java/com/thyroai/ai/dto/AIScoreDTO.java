package com.thyroai.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AIScoreDTO {
    private UUID id;
    private UUID examinationId;
    private Double malignancyProbability;
    private String tiradsScore;
    private String justification;
}
