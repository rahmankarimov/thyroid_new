package com.thyroai.hospital;

import com.thyroai.common.ApiResponse;
import com.thyroai.hospital.HospitalService.AdminWithStatus;
import com.thyroai.hospital.dto.CreateHospitalRequest;
import com.thyroai.hospital.dto.HospitalDTO;
import com.thyroai.hospital.dto.HospitalFeatureGrantDTO;
import com.thyroai.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hospitals")
@Tag(name = "Hospital Management")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalService hospitalService;

    @Operation(summary = "List all hospitals (super admin)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<HospitalDTO>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.findAll()));
    }

    @Operation(summary = "Get hospital of the current user")
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<HospitalDTO>> mine(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.findByUserEmail(principal.getUsername())));
    }

    @Operation(summary = "Get a hospital by id (super admin)")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<HospitalDTO>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.findById(id)));
    }

    @Operation(summary = "Create a hospital (super admin)")
    @PostMapping
    public ResponseEntity<ApiResponse<HospitalDTO>> create(@RequestBody CreateHospitalRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.create(req)));
    }

    @Operation(summary = "Enable or disable a hospital (super admin)")
    @PutMapping("/{id}/active")
    public ResponseEntity<ApiResponse<HospitalDTO>> setActive(
            @PathVariable UUID id, @RequestBody SetActiveRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.setActive(id, req.isActive())));
    }

    @Operation(summary = "Update feature grants for a hospital (super admin)")
    @PutMapping("/{id}/grants")
    public ResponseEntity<ApiResponse<HospitalDTO>> updateGrants(
            @PathVariable UUID id, @RequestBody HospitalFeatureGrantDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.updateGrants(id, dto)));
    }

    @Operation(summary = "Delete a hospital and all its personnel (super admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        hospitalService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @Operation(summary = "List admins for a hospital with their active status (super admin)")
    @GetMapping("/{id}/admins")
    public ResponseEntity<ApiResponse<List<SimpleUserDTO>>> listAdmins(@PathVariable UUID id) {
        List<SimpleUserDTO> admins = hospitalService.findAdminsForHospital(id).stream()
                .map(a -> SimpleUserDTO.from(a.user(), a.active()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(admins));
    }

    @Operation(summary = "Create an admin for a hospital (super admin)")
    @PostMapping("/{id}/admins")
    public ResponseEntity<ApiResponse<SimpleUserDTO>> createAdmin(
            @PathVariable UUID id, @RequestBody CreateAdminRequest req) {
        User admin = hospitalService.createAdminForHospital(
                id, req.getEmail(), req.getPassword(), req.getFirstName(), req.getLastName());
        return ResponseEntity.ok(ApiResponse.ok(SimpleUserDTO.from(admin, true)));
    }

    @Operation(summary = "Block or unblock an admin (super admin)")
    @PutMapping("/{id}/admins/{adminId}/active")
    public ResponseEntity<ApiResponse<Void>> setAdminActive(
            @PathVariable UUID id,
            @PathVariable UUID adminId,
            @RequestBody SetActiveRequest req) {
        hospitalService.setAdminActive(adminId, req.isActive());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Inner DTOs (only used by this controller) ────────────────────────────

    @Data
    public static class SetActiveRequest {
        private boolean active;
    }

    @Data
    public static class CreateAdminRequest {
        private String email;
        private String password;
        private String firstName;
        private String lastName;
    }

    @Data
    public static class SimpleUserDTO {
        private UUID    id;
        private String  email;
        private String  firstName;
        private String  lastName;
        private boolean active;

        static SimpleUserDTO from(User u, boolean active) {
            SimpleUserDTO dto = new SimpleUserDTO();
            dto.id        = u.getId();
            dto.email     = u.getEmail();
            dto.firstName = u.getFirstName();
            dto.lastName  = u.getLastName();
            dto.active    = active;
            return dto;
        }
    }
}
