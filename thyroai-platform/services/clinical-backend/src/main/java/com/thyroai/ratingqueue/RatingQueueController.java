package com.thyroai.ratingqueue;

import com.thyroai.common.ApiResponse;
import com.thyroai.ratingqueue.dto.QueueNextResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/rating-queue")
@RequiredArgsConstructor
public class RatingQueueController {

    private final RatingQueueService service;

    @GetMapping("/next")
    public ResponseEntity<ApiResponse<QueueNextResponse>> getNext(
            @RequestParam(value = "expireCurrent", defaultValue = "false") boolean expireCurrent) {
        try {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore().mustRevalidate())
                    .body(ApiResponse.ok(service.getNextRandomExaminationId(expireCurrent)));
        } catch (Exception e) {
            log.error("Failed to retrieve next examination from rating queue: {}", e.getMessage());
            return ResponseEntity.status(404)
                    .cacheControl(CacheControl.noStore().mustRevalidate())
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/release")
    public ResponseEntity<ApiResponse<Void>> releaseCurrentReservation() {
        try {
            service.releaseCurrentReservation();
            return ResponseEntity.ok(ApiResponse.ok(null));
        } catch (Exception e) {
            log.error("Failed to release active reservation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
