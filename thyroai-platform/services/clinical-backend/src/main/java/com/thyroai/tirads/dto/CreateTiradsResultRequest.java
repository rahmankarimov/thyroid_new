package com.thyroai.tirads.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTiradsResultRequest {
    private int totalPoints;

    @NotNull(message = "TI-RADS dərəcəsi mütləqdir")
    private String level;

    @NotBlank(message = "Composition mütləq seçilməlidir")
    private String composition;

    @NotBlank(message = "Echogenicity mütləq seçilməlidir")
    private String echogenicity;

    @NotBlank(message = "Shape mütləq seçilməlidir")
    private String shape;

    @NotBlank(message = "Margin mütləq seçilməlidir")
    private String margin;

    @NotBlank(message = "Echogenic foci mütləq seçilməlidir")
    private String echogenicFoci;
}
