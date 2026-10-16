package com.thyroai.tirads;

import com.thyroai.common.ApiResponse;
import com.thyroai.tirads.dto.CreateTiradsResultRequest;
import com.thyroai.tirads.dto.TiradsResultDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/examinations/{examinationId}/tirads")
@RequiredArgsConstructor
public class TiradsResultController {

    private final TiradsResultService service;

    @PostMapping
    public ResponseEntity<ApiResponse<TiradsResultDTO>> create(
            @PathVariable UUID examinationId,
            @Valid @RequestBody CreateTiradsResultRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.create(examinationId, request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TiradsResultDTO>>> getByExamination(@PathVariable UUID examinationId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByExamination(examinationId)));
    }
}
