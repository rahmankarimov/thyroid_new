package com.thyroai.ratingqueue;

import com.thyroai.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/rating-queue")
@RequiredArgsConstructor
public class RatingQueueController {

    private final RatingQueueService service;

    @GetMapping("/next")
    public ResponseEntity<ApiResponse<java.util.Map<String, UUID>>> getNext() {
        try {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore().mustRevalidate())
                    .body(ApiResponse.ok(service.getNextRandomExaminationId()));
        } catch (Exception e) {
            log.error("Failed to retrieve next random examination from rating queue: {}", e.getMessage());
            return ResponseEntity.status(404)
                    .cacheControl(CacheControl.noStore().mustRevalidate())
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}
