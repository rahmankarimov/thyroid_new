package com.thyroai.auth;

import com.thyroai.auth.dto.LoginRequest;
import com.thyroai.auth.dto.LoginResponse;
import com.thyroai.config.JwtConfig;
import com.thyroai.config.RecaptchaService;
import com.thyroai.user.User;
import com.thyroai.user.UserPermission;
import com.thyroai.user.UserPermissionRepository;
import com.thyroai.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager    authenticationManager;
    private final UserService              userService;
    private final JwtConfig                jwtConfig;
    private final UserPermissionRepository permissionRepository;
    private final RecaptchaService         recaptchaService;

    public LoginResponse login(LoginRequest request) {
        recaptchaService.verify(request.getRecaptchaToken());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        User user = userService.findByEmail(request.getEmail());
        UserDetails userDetails = userService.loadUserByUsername(request.getEmail());
        boolean mustChangePw = permissionRepository.findByUser_Id(user.getId())
                .map(UserPermission::isMustChangePassword)
                .orElse(false);
        return LoginResponse.builder()
                .token(jwtConfig.generateToken(userDetails))
                .refreshToken(jwtConfig.generateRefreshToken(userDetails))
                .user(userService.toDTO(user))
                .mustChangePassword(mustChangePw)
                .build();
    }

    public String refresh(String refreshToken) {
        String email = jwtConfig.extractUsername(refreshToken);
        UserDetails userDetails = userService.loadUserByUsername(email);
        if (jwtConfig.isTokenValid(refreshToken, userDetails)) {
            return jwtConfig.generateToken(userDetails);
        }
        throw new IllegalStateException("Invalid refresh token");
    }

    public void logout(String token) {
        jwtConfig.blacklistToken(token);
    }
}
