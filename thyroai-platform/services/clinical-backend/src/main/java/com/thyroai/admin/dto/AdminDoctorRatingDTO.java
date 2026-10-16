package com.thyroai.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class AdminDoctorRatingDTO {
    private UUID examinationId;
    private UUID patientId;
    private Integer totalPoints;
    private String level;
    private OffsetDateTime createdAt;
}
