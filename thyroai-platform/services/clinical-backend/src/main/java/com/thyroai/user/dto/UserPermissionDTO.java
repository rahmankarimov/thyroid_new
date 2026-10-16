package com.thyroai.user.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserPermissionDTO {
    private UUID userId;
    private boolean canAnnotate;
    private boolean canViewAnnotations;
    private boolean canSubmitDiagnosis;
    private boolean canSeeAi;
    private boolean canSeeGallery;
    private boolean active;
    private boolean mustChangePassword;
    private boolean canSeePatients;
}
