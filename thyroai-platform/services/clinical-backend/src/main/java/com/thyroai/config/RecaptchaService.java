package com.thyroai.config;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
@Slf4j
public class RecaptchaService {

    @Value("${thyroai.recaptcha.secret:}")
    private String secretKey;

    @Value("${thyroai.recaptcha.enabled:false}")
    private boolean enabled;

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    public void verify(String token) {
        if (!enabled) return;
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("reCAPTCHA verification required.");
        }
        RestTemplate restTemplate = new RestTemplate();
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("secret", secretKey);
        params.add("response", token);
        try {
            ResponseEntity<RecaptchaResponse> response =
                    restTemplate.postForEntity(VERIFY_URL, params, RecaptchaResponse.class);
            RecaptchaResponse body = response.getBody();
            if (body == null || !body.success()) {
                throw new IllegalArgumentException("reCAPTCHA verification failed. Please try again.");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("reCAPTCHA verification error: {}", e.getMessage());
            throw new IllegalArgumentException("reCAPTCHA service unavailable. Please try again.");
        }
    }

    record RecaptchaResponse(
            boolean success,
            @JsonProperty("error-codes") List<String> errorCodes
    ) {}
}
