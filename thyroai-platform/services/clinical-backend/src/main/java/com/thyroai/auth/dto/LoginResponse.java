package com.thyroai.auth.dto;

import com.thyroai.user.dto.UserDTO;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String token;
    private String refreshToken;
    private UserDTO user;
    private boolean mustChangePassword;
}
