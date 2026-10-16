package com.thyroai.pathology;

import com.thyroai.common.ApiResponse;
import com.thyroai.pathology.dto.PathologyResultDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pathology")
@Tag(name = "Pathology")
@RequiredArgsConstructor
public class PathologyController {

    private final PathologyService pathologyService;

    @Operation(summary = "Get pathology result for an examination")
    @GetMapping("/examination/{examinationId}")
    public ResponseEntity<ApiResponse<PathologyResultDTO>> getByExamination(@PathVariable UUID examinationId) {
        return ResponseEntity.ok(ApiResponse.ok(pathologyService.findByExaminationId(examinationId)));
    }

    @Operation(summary = "Submit pathology result")
    @PostMapping
    public ResponseEntity<ApiResponse<PathologyResultDTO>> submit(
            @Valid @RequestBody PathologyResultDTO.Request request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(pathologyService.submit(request, userDetails.getUsername())));
    }
}
