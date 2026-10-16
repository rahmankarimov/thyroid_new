package com.thyroai.user;

import com.thyroai.common.ApiResponse;
import com.thyroai.user.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management")
@RequiredArgsConstructor
public class UserManagementController {

    private final UserManagementService managementService;
    private final UserService           userService;

    // ── Current user (any authenticated) ────────────────────────────────────

    @Operation(summary = "Get current user's permissions")
    @GetMapping("/me/permissions")
    public ResponseEntity<ApiResponse<UserPermissionDTO>> myPermissions(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userService.findByEmail(principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(managementService.getPermissions(user.getId())));
    }

    @Operation(summary = "Change own password (clears must-change-password flag)")
    @PutMapping("/me/change-password")
    public ResponseEntity<ApiResponse<Void>> changeMyPassword(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody ChangePasswordRequest req) {
        managementService.changeMyPassword(principal.getUsername(), req.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Admin: list & create ─────────────────────────────────────────────────

    @Operation(summary = "List all users with permissions (admin — scoped to hospital)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserWithPermissionsDTO>>> listAll(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok(managementService.findAllForAdmin(principal.getUsername())));
    }

    @Operation(summary = "Create a new user (admin)")
    @PostMapping
    public ResponseEntity<ApiResponse<UserWithPermissionsDTO>> create(
            @RequestBody CreateUserRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok(managementService.create(req, principal.getUsername())));
    }

    // ── Admin: update & delete ───────────────────────────────────────────────

    @Operation(summary = "Update user details (admin)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserWithPermissionsDTO>> update(
            @PathVariable UUID id, @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(managementService.update(id, req)));
    }

    @Operation(summary = "Reset user password (admin)")
    @PutMapping("/{id}/password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable UUID id, @RequestBody ResetPasswordRequest req) {
        managementService.resetPassword(id, req.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @Operation(summary = "Delete user (admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        managementService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Admin: per-user permissions ──────────────────────────────────────────

    @Operation(summary = "Get permissions for a user (admin)")
    @GetMapping("/{id}/permissions")
    public ResponseEntity<ApiResponse<UserPermissionDTO>> getPermissions(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(managementService.getPermissions(id)));
    }

    @Operation(summary = "Update permissions for a user (admin)")
    @PutMapping("/{id}/permissions")
    public ResponseEntity<ApiResponse<UserPermissionDTO>> updatePermissions(
            @PathVariable UUID id, @RequestBody UserPermissionDTO req) {
        return ResponseEntity.ok(ApiResponse.ok(managementService.updatePermissions(id, req)));
    }
}
