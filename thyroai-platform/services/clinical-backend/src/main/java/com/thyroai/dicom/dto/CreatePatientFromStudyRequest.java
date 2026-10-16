package com.thyroai.dicom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

/**
 * Creates a patient from an unmatched study's DICOM demographics and attaches the
 * study to it. The admin confirms every field — nothing is taken from DICOM on trust.
 */
@Data
public class CreatePatientFromStudyRequest {

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    private String fin;

    private LocalDate dateOfBirth;
    private String gender;
    private String referredBy;
}
