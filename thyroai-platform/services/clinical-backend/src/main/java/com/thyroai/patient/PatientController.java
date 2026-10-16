package com.thyroai.patient;

import com.thyroai.common.ApiResponse;
import com.thyroai.common.PagedResponse;
import com.thyroai.patient.dto.PatientDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@Tag(name = "Patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @Operation(summary = "Get paginated patient list (hospital-scoped for admin; assigned-only for doctor)")
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<PatientDTO>>> getAll(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "lastName") String sort) {
        Page<PatientDTO> result = patientService.findAll(principal.getUsername(), search, PageRequest.of(page, size, Sort.by(sort)));
        PagedResponse<PatientDTO> response = PagedResponse.<PatientDTO>builder()
                .content(result.getContent())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Get single patient with examinations")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PatientDTO>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok(patientService.findById(id, principal.getUsername())));
    }

    @Operation(summary = "Create a new patient (admin only — scoped to admin's hospital)")
    @PostMapping
    public ResponseEntity<ApiResponse<PatientDTO>> create(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody CreatePatientRequest req) {
        Patient patient = patientService.create(req.getFirstName(), req.getLastName(),
                req.getFin(), req.getDateOfBirth(), req.getGender(), req.getReferredBy(), principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(patientService.findById(patient.getId(), principal.getUsername())));
    }

    @Operation(summary = "Replace the full set of doctors assigned to a patient (admin only)")
    @PutMapping("/{id}/assignments")
    public ResponseEntity<ApiResponse<Void>> assignDoctors(
            @PathVariable UUID id,
            @RequestBody AssignDoctorsRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        patientService.assignDoctors(id, req.getDoctorIds(), principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @Operation(summary = "Get the IDs of doctors assigned to a patient")
    @GetMapping("/{id}/assignments")
    public ResponseEntity<ApiResponse<List<UUID>>> getAssignments(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(patientService.getAssignedDoctorIds(id)));
    }

    @Data
    public static class CreatePatientRequest {
        private String    firstName;
        private String    lastName;
        private String    fin;
        private LocalDate dateOfBirth;
        private String    gender;
        private String    referredBy;
    }

    @Data
    public static class AssignDoctorsRequest {
        private List<UUID> doctorIds;
    }
}
