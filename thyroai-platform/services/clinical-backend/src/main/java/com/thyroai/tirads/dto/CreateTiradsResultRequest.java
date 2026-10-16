package com.thyroai.tirads.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTiradsResultRequest {
    private int totalPoints;
    @NotNull
    private String level;
    private String composition;
    private String echogenicity;
    private String shape;
    private String margin;
    private String echogenicFoci;
}
