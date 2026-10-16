package com.thyroai.widget;

import com.thyroai.hospital.Hospital;
import com.thyroai.user.User;
import com.thyroai.user.UserRole;
import com.thyroai.user.UserService;
import com.thyroai.widget.dto.WidgetSettingsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class WidgetSettingsService {

    private final WidgetSettingsRepository repository;
    private final UserService userService;

    public WidgetSettingsDTO getForEmail(String email) {
        User user = userService.findByEmail(email);
        if (user.getHospital() == null) return defaultDTO();
        Hospital hospital = user.getHospital();

        boolean isDoctorView = user.getRole() == UserRole.DOCTOR
                || user.getRole() == UserRole.ASSISTANT;

        return repository.findByHospital_Id(hospital.getId())
                .map(ws -> isDoctorView ? toEffectiveDTO(ws, hospital) : toDTO(ws))
                .orElseGet(() -> isDoctorView ? grantOnlyDTO(hospital) : defaultDTO());
    }

    @Transactional
    public WidgetSettingsDTO updateForEmail(WidgetSettingsDTO dto, String adminEmail) {
        User admin = userService.findByEmail(adminEmail);
        if (admin.getHospital() == null) throw new IllegalStateException("Admin has no hospital assigned.");
        Hospital hospital = admin.getHospital();
        WidgetSettings ws = repository.findByHospital_Id(hospital.getId())
                .orElseGet(() -> WidgetSettings.builder().hospital(hospital).build());
        ws.setShowAISuggestion(dto.isShowAISuggestion());
        ws.setShowPathologyInput(dto.isShowPathologyInput());
        ws.setShowAnnotationTool(dto.isShowAnnotationTool());
        ws.setShowViewAnnotations(dto.isShowViewAnnotations());
        ws.setShowImageGallery(dto.isShowImageGallery());
        ws.setShowTiradsCalculator(dto.isShowTiradsCalculator());
        ws.setUpdatedAt(LocalDateTime.now());
        ws.setUpdatedBy(admin);
        return toDTO(repository.save(ws));
    }

    // Effective value for doctors: feature must be both granted by super admin AND enabled by admin.
    private WidgetSettingsDTO toEffectiveDTO(WidgetSettings ws, Hospital h) {
        return WidgetSettingsDTO.builder()
                .showAISuggestion(ws.isShowAISuggestion()    && h.isGrantAiSuggestion())
                .showPathologyInput(ws.isShowPathologyInput() && h.isGrantPathologyInput())
                .showAnnotationTool(ws.isShowAnnotationTool()&& h.isGrantAnnotationTool())
                .showViewAnnotations(ws.isShowViewAnnotations() && h.isGrantViewAnnotations())
                .showImageGallery(ws.isShowImageGallery()    && h.isGrantImageGallery())
                .showTiradsCalculator(ws.isShowTiradsCalculator()) // no super-admin grant
                .build();
    }

    // When no widget_settings row exists yet, fall back to grants alone for doctors.
    private WidgetSettingsDTO grantOnlyDTO(Hospital h) {
        return WidgetSettingsDTO.builder()
                .showAISuggestion(h.isGrantAiSuggestion())
                .showPathologyInput(h.isGrantPathologyInput())
                .showAnnotationTool(h.isGrantAnnotationTool())
                .showViewAnnotations(h.isGrantViewAnnotations())
                .showImageGallery(h.isGrantImageGallery())
                .showTiradsCalculator(true)
                .build();
    }

    private WidgetSettingsDTO defaultDTO() {
        return WidgetSettingsDTO.builder()
                .showAISuggestion(true).showPathologyInput(true)
                .showAnnotationTool(true).showViewAnnotations(true).showImageGallery(true)
                .showTiradsCalculator(true)
                .build();
    }

    private WidgetSettingsDTO toDTO(WidgetSettings ws) {
        return WidgetSettingsDTO.builder()
                .showAISuggestion(ws.isShowAISuggestion())
                .showPathologyInput(ws.isShowPathologyInput())
                .showAnnotationTool(ws.isShowAnnotationTool())
                .showViewAnnotations(ws.isShowViewAnnotations())
                .showImageGallery(ws.isShowImageGallery())
                .showTiradsCalculator(ws.isShowTiradsCalculator())
                .build();
    }
}
