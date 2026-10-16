package com.thyroai.patient.dto;

import com.thyroai.examination.dto.ExaminationDTO;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class PatientDTO {
    private UUID id;
    private String firstName;
    private String lastName;
    private String fin;
    private LocalDate dateOfBirth;
    private String gender;
    private String referredBy;
    private List<ExaminationDTO> examinations;
    private List<UUID> assignedDoctorIds;
}
