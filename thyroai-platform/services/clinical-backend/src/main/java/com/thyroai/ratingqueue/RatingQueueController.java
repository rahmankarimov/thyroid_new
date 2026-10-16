package com.thyroai.ratingqueue;

import com.thyroai.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rating-queue")
@RequiredArgsConstructor
public class RatingQueueController {

    private final RatingQueueService service;

    @GetMapping("/next")
    public ResponseEntity<ApiResponse<java.util.Map<String, UUID>>> getNext() {
        try {
            return ResponseEntity.ok(ApiResponse.ok(service.getNextRandomExaminationId()));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }
}
