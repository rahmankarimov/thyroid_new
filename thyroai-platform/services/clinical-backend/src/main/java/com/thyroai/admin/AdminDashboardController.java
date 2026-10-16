package com.thyroai.admin;

import com.thyroai.admin.dto.AdminStatsDTO;
import com.thyroai.admin.dto.DoctorActivityDTO;
import com.thyroai.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService service;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsDTO>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(service.getStats()));
    }

    @GetMapping("/doctor-activity")
    public ResponseEntity<ApiResponse<List<DoctorActivityDTO>>> getDoctorActivity() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDoctorActivity()));
    }

    @GetMapping("/doctor-activity/{doctorId}/ratings")
    public ResponseEntity<ApiResponse<List<com.thyroai.admin.dto.AdminDoctorRatingDTO>>> getDoctorRatings(@org.springframework.web.bind.annotation.PathVariable java.util.UUID doctorId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDoctorRatings(doctorId)));
    }
}
