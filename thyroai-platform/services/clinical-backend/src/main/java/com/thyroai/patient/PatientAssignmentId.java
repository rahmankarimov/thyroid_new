package com.thyroai.patient;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientAssignmentId implements Serializable {
    private UUID patient;
    private UUID doctor;
}
