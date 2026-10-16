package com.thyroai.annotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AnnotationDTO {
    private UUID    id;
    private UUID    imageSeriesId;
    private UUID    patientId;
    private UUID    doctorId;
    private String  doctorName;
    private String  path;
    private String  comment;
    private String  color;
    private boolean shared;
    @JsonProperty("isOwner")
    private boolean isOwner;
    private LocalDateTime createdAt;

    @Data
    public static class Request {
        @NotNull  private UUID    imageSeriesId;
        @NotNull  private UUID    patientId;
        @NotBlank private String  path;
        @NotBlank private String  comment;
                  private String  color;
    }

    @Data
    public static class SharedRequest {
        private boolean shared;
    }
}
