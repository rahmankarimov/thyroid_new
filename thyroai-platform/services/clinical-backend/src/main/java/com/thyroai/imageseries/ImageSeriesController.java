package com.thyroai.imageseries;

import com.thyroai.common.ApiResponse;
import com.thyroai.imageseries.dto.ImageSeriesDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/image-series")
@Tag(name = "Image Series")
@RequiredArgsConstructor
public class ImageSeriesController {

    private final ImageSeriesService imageSeriesService;

    @Operation(summary = "Upload a UZI image for an examination (admin only)")
    @PostMapping("/examination/{examinationId}")
    public ResponseEntity<ApiResponse<ImageSeriesDTO>> upload(
            @PathVariable UUID examinationId,
            @RequestParam(required = false) String label,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok(imageSeriesService.upload(examinationId, label, file)));
    }

    @Operation(summary = "Get all image series for an examination")
    @GetMapping("/examination/{examinationId}")
    public ResponseEntity<ApiResponse<List<ImageSeriesDTO>>> getByExamination(@PathVariable UUID examinationId) {
        return ResponseEntity.ok(ApiResponse.ok(imageSeriesService.findByExaminationId(examinationId)));
    }
}
