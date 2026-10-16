package com.thyroai.tirads.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TiradsResultDTO {
    private UUID id;
    private UUID examinationId;
    private int totalPoints;
    private String level;
    private String composition;
    private String echogenicity;
    private String shape;
    private String margin;
    private String echogenicFoci;
    private OffsetDateTime createdAt;
    private UUID createdById;
    private String createdByName;
}
