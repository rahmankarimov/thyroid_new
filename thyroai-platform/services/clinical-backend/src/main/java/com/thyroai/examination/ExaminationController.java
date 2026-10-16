package com.thyroai.examination;

import com.thyroai.common.ApiResponse;
import com.thyroai.examination.dto.ExaminationDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/examinations")
@Tag(name = "Examinations")
@RequiredArgsConstructor
public class ExaminationController {

    private final ExaminationService examinationService;

    @Operation(summary = "Create an examination for a patient (admin only)")
    @PostMapping
    public ResponseEntity<ApiResponse<ExaminationDTO>> create(@RequestBody CreateExaminationRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(examinationService.create(req.getPatientId(), req.getExaminationDate())));
    }

    @Operation(summary = "Get all examinations for a patient")
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<ExaminationDTO>>> getByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(ApiResponse.ok(examinationService.findByPatientId(patientId)));
    }

    @Operation(summary = "Get single examination with all nested data")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExaminationDTO>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(examinationService.findById(id)));
    }

    @Data
    public static class CreateExaminationRequest {
        private UUID      patientId;
        private LocalDate examinationDate;
    }
}
