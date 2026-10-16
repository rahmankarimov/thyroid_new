package com.thyroai.dicom.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LinkPatientRequest {

    @NotNull
    private UUID patientId;
}
