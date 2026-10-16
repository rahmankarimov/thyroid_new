package com.thyroai.audit.dto;

import com.thyroai.common.AuditAction;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AuditLogDTO {
    private UUID id;
    private String doctorEmail;
    private UUID patientId;
    private AuditAction action;
    private String details;
    private String ipAddress;
    private LocalDateTime timestamp;

    @Data
    public static class Request {
        private UUID patientId;

        @NotNull
        private AuditAction action;

        private String details;
    }
}
