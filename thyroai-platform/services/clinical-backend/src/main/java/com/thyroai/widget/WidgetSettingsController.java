package com.thyroai.widget;

import com.thyroai.common.ApiResponse;
import com.thyroai.widget.dto.WidgetSettingsDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/widget-settings")
@Tag(name = "Widget Settings")
@RequiredArgsConstructor
public class WidgetSettingsController {

    private final WidgetSettingsService widgetSettingsService;

    @Operation(summary = "Get widget settings for the caller's hospital")
    @GetMapping
    public ResponseEntity<ApiResponse<WidgetSettingsDTO>> get(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(widgetSettingsService.getForEmail(userDetails.getUsername())));
    }

    @Operation(summary = "Update widget settings (Admin only)")
    @PutMapping
    public ResponseEntity<ApiResponse<WidgetSettingsDTO>> update(
            @RequestBody WidgetSettingsDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(widgetSettingsService.updateForEmail(dto, userDetails.getUsername())));
    }
}
