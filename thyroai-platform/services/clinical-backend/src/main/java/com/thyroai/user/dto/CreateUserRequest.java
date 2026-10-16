package com.thyroai.user.dto;

import com.thyroai.user.UserRole;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateUserRequest {
    private String email;
    private String password;
    private String firstName;
    private String lastName;
    private UserRole role;
    private UUID customRoleId;
}
