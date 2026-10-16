package com.thyroai.admin;

import com.thyroai.admin.dto.AdminStatsDTO;
import com.thyroai.admin.dto.DoctorActivityDTO;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.tirads.TiradsResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final ExaminationRepository examinationRepository;
    private final TiradsResultRepository tiradsResultRepository;

    public AdminStatsDTO getStats() {
        long total = examinationRepository.count();
        long pending = examinationRepository.countByStatus("PENDING_REVIEW");
        long completed = examinationRepository.countByStatus("COMPLETED");

        return AdminStatsDTO.builder()
                .totalImages(total)
                .pendingReview(pending)
                .completed(completed)
                .build();
    }

    public List<DoctorActivityDTO> getDoctorActivity() {
        return tiradsResultRepository.getDoctorActivity();
    }

    public List<com.thyroai.admin.dto.AdminDoctorRatingDTO> getDoctorRatings(java.util.UUID doctorId) {
        return tiradsResultRepository.findByCreatedByIdOrderByCreatedAtDesc(doctorId)
                .stream()
                .map(entity -> com.thyroai.admin.dto.AdminDoctorRatingDTO.builder()
                        .examinationId(entity.getExamination().getId())
                        .patientId(entity.getExamination().getPatient().getId())
                        .totalPoints(entity.getTotalPoints())
                        .level(entity.getLevel())
                        .createdAt(entity.getCreatedAt())
                        .build())
                .toList();
    }
}
