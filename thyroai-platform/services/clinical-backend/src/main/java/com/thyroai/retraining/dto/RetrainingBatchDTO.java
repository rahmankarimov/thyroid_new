package com.thyroai.retraining.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class RetrainingBatchDTO {
    private UUID id;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private int caseCount;
    private String status;
}
