package com.thyroai.user.dto;

import com.thyroai.user.UserRole;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserWithPermissionsDTO {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private UserRole role;
    private boolean active;
    private String customRoleName;
    private UserPermissionDTO permissions;
}
