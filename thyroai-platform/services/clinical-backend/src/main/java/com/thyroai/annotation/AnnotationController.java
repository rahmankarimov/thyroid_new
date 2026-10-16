package com.thyroai.annotation;

import com.thyroai.annotation.dto.AnnotationDTO;
import com.thyroai.common.ApiResponse;
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
@RequestMapping("/api/v1/annotations")
@Tag(name = "Annotations")
@RequiredArgsConstructor
public class AnnotationController {

    private final AnnotationService annotationService;

    @Operation(summary = "Get annotations for an image series (own + shared)")
    @GetMapping("/image/{imageSeriesId}")
    public ResponseEntity<ApiResponse<List<AnnotationDTO>>> getByImage(
            @PathVariable UUID imageSeriesId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                annotationService.findByImageSeriesId(imageSeriesId, userDetails.getUsername())));
    }

    @Operation(summary = "Create annotation")
    @PostMapping
    public ResponseEntity<ApiResponse<AnnotationDTO>> create(
            @Valid @RequestBody AnnotationDTO.Request request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                annotationService.create(request, userDetails.getUsername())));
    }

    @Operation(summary = "Toggle shared visibility of an annotation (owner only)")
    @PatchMapping("/{id}/shared")
    public ResponseEntity<ApiResponse<AnnotationDTO>> setShared(
            @PathVariable UUID id,
            @RequestBody AnnotationDTO.SharedRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                annotationService.setShared(id, userDetails.getUsername(), req.isShared())));
    }

    @Operation(summary = "Soft delete annotation (owner only, locked after diagnosis)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        annotationService.delete(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
