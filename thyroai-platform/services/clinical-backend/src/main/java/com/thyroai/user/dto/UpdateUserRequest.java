package com.thyroai.user.dto;

import com.thyroai.user.UserRole;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateUserRequest {
    private String firstName;
    private String lastName;
    private UserRole role;
    private Boolean active;
    private UUID customRoleId;
    private Boolean clearCustomRole;
}
