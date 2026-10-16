package com.thyroai.examinationmetric;

import com.thyroai.common.ApiResponse;
import com.thyroai.examinationmetric.dto.ExaminationMetricDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/examination-metrics")
@Tag(name = "Examination Manual Values")
@RequiredArgsConstructor
public class ExaminationMetricController {

    private final ExaminationMetricService metricService;

    @Operation(summary = "Get manual key/value pairs for an examination")
    @GetMapping("/examination/{examinationId}")
    public ResponseEntity<ApiResponse<List<ExaminationMetricDTO>>> getByExamination(
            @PathVariable UUID examinationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                metricService.findByExamination(examinationId, userDetails.getUsername())));
    }

    @Operation(summary = "Get manual key/value pairs across all of a patient's examinations (history)")
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<ExaminationMetricDTO>>> getByPatient(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                metricService.findByPatient(patientId, userDetails.getUsername())));
    }

    @Operation(summary = "Add a manual key/value pair to an examination (locked after diagnosis)")
    @PostMapping
    public ResponseEntity<ApiResponse<ExaminationMetricDTO>> create(
            @Valid @RequestBody ExaminationMetricDTO.Request request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                metricService.create(request, userDetails.getUsername())));
    }

    @Operation(summary = "Delete a manual key/value pair (author only, locked after diagnosis)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        metricService.delete(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
