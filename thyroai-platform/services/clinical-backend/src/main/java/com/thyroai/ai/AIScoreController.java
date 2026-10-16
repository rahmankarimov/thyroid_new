package com.thyroai.ai;

import com.thyroai.ai.dto.AIScoreDTO;
import com.thyroai.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai-scores")
@Tag(name = "AI Scores")
@RequiredArgsConstructor
public class AIScoreController {

    private final AIScoreService aiScoreService;

    @Operation(summary = "Get AI score for an examination")
    @GetMapping("/examination/{examinationId}")
    public ResponseEntity<ApiResponse<AIScoreDTO>> getByExamination(@PathVariable UUID examinationId) {
        return ResponseEntity.ok(ApiResponse.ok(aiScoreService.findByExaminationId(examinationId)));
    }
}
