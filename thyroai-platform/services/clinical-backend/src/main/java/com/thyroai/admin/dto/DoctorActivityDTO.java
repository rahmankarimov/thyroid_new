package com.thyroai.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorActivityDTO {
    private UUID doctorId;
    private String doctorName;
    private String email;
    private long ratedCount;
}
