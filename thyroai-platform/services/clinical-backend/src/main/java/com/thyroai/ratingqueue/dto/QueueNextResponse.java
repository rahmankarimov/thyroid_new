package com.thyroai.ratingqueue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueNextResponse {
    private UUID patientId;
    private UUID examId;
    private long remainingSeconds;
    private String expiresAt;
}
