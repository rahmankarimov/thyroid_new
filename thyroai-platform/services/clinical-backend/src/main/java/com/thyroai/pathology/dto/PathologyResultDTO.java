package com.thyroai.pathology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PathologyResultDTO {
    private UUID id;
    private UUID examinationId;
    private String diagnosis;
    private String notes;
    private String confirmedBy;
    private LocalDateTime confirmedAt;
    private boolean approvedForRetraining;

    @Data
    public static class Request {
        @NotNull
        private UUID examinationId;
        @NotBlank
        private String diagnosis;
        private String notes;
    }
}
