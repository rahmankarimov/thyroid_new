package com.thyroai.examinationmetric.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ExaminationMetricDTO {
    private UUID    id;
    private UUID    examinationId;
    private UUID    patientId;
    private String  key;
    private String  value;
    private String  doctorName;
    @JsonProperty("isOwner")
    private boolean isOwner;
    private LocalDateTime createdAt;

    @Data
    public static class Request {
        @NotNull  private UUID   examinationId;
        @NotBlank private String key;
        @NotBlank private String value;
    }
}
