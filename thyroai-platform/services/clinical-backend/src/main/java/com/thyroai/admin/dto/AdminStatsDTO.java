package com.thyroai.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminStatsDTO {
    private long totalImages;
    private long pendingReview;
    private long completed;
}
