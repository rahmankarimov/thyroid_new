package com.thyroai.hospital;

import com.thyroai.hospital.dto.CreateHospitalRequest;
import com.thyroai.hospital.dto.HospitalDTO;
import com.thyroai.hospital.dto.HospitalFeatureGrantDTO;
import com.thyroai.patient.PatientAssignmentRepository;
import com.thyroai.user.User;
import com.thyroai.user.UserPermission;
import com.thyroai.user.UserPermissionRepository;
import com.thyroai.user.UserRepository;
import com.thyroai.user.UserRole;
import com.thyroai.widget.WidgetSettings;
import com.thyroai.widget.WidgetSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HospitalService {

    private final HospitalRepository          hospitalRepository;
    private final UserRepository              userRepository;
    private final UserPermissionRepository    permissionRepository;
    private final WidgetSettingsRepository    widgetSettingsRepository;
    private final PatientAssignmentRepository patientAssignmentRepository;
    private final PasswordEncoder             passwordEncoder;

    public List<HospitalDTO> findAll() {
        return hospitalRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    public HospitalDTO findById(UUID id) {
        return toDTO(hospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found")));
    }

    public HospitalDTO findByUserEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getHospital() == null) throw new IllegalStateException("User has no hospital");
        return toDTO(user.getHospital());
    }

    @Transactional
    public HospitalDTO create(CreateHospitalRequest req) {
        if (req.getName() == null || req.getName().isBlank())
            throw new IllegalArgumentException("Hospital name is required.");
        if (req.getCode() == null || req.getCode().isBlank())
            throw new IllegalArgumentException("Hospital code is required.");
        if (hospitalRepository.existsByCode(req.getCode().toUpperCase()))
            throw new IllegalArgumentException("Code already in use: " + req.getCode());

        Hospital hospital = hospitalRepository.save(Hospital.builder()
                .name(req.getName().trim())
                .code(req.getCode().toUpperCase().trim())
                .build());

        widgetSettingsRepository.save(WidgetSettings.builder().hospital(hospital).build());
        return toDTO(hospital);
    }

    @Transactional
    public HospitalDTO setActive(UUID id, boolean active) {
        Hospital hospital = hospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found"));
        hospital.setActive(active);
        return toDTO(hospitalRepository.save(hospital));
    }

    @Transactional
    public HospitalDTO updateGrants(UUID id, HospitalFeatureGrantDTO dto) {
        Hospital hospital = hospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found"));
        hospital.setGrantAiSuggestion(dto.isGrantAiSuggestion());
        hospital.setGrantPathologyInput(dto.isGrantPathologyInput());
        hospital.setGrantAnnotationTool(dto.isGrantAnnotationTool());
        hospital.setGrantViewAnnotations(dto.isGrantViewAnnotations());
        hospital.setGrantImageGallery(dto.isGrantImageGallery());
        return toDTO(hospitalRepository.save(hospital));
    }

    @Transactional
    public void delete(UUID id) {
        Hospital hospital = hospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found"));
        List<User> users = userRepository.findByHospital_Id(id);
        List<UUID> userIds = users.stream().map(User::getId).toList();
        patientAssignmentRepository.deleteByDoctor_IdIn(userIds);
        patientAssignmentRepository.deleteByAssignedBy_IdIn(userIds);
        for (User u : users) {
            permissionRepository.findByUser_Id(u.getId()).ifPresent(permissionRepository::delete);
        }
        userRepository.deleteAll(users);
        widgetSettingsRepository.findByHospital_Id(id).ifPresent(widgetSettingsRepository::delete);
        hospitalRepository.delete(hospital);
    }

    public record AdminWithStatus(User user, boolean active) {}

    public List<AdminWithStatus> findAdminsForHospital(UUID hospitalId) {
        return userRepository.findByHospital_Id(hospitalId).stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .map(u -> {
                    boolean active = permissionRepository.findByUser_Id(u.getId())
                            .map(UserPermission::isActive)
                            .orElse(true);
                    return new AdminWithStatus(u, active);
                })
                .toList();
    }

    @Transactional
    public void setAdminActive(UUID adminId, boolean active) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (admin.getRole() != UserRole.ADMIN)
            throw new IllegalArgumentException("Target user is not an admin");
        UserPermission perm = permissionRepository.findByUser_Id(adminId)
                .orElseGet(() -> UserPermission.builder().user(admin).build());
        perm.setActive(active);
        permissionRepository.save(perm);
    }

    @Transactional
    public User createAdminForHospital(UUID hospitalId, String email, String password,
                                       String firstName, String lastName) {
        Hospital hospital = hospitalRepository.findById(hospitalId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found"));
        if (userRepository.findByEmail(email).isPresent())
            throw new IllegalArgumentException("Email already in use: " + email);

        User admin = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .role(UserRole.ADMIN)
                .hospital(hospital)
                .build());
        permissionRepository.save(UserPermission.builder().user(admin).build());
        return admin;
    }

    private HospitalDTO toDTO(Hospital h) {
        return HospitalDTO.builder()
                .id(h.getId())
                .name(h.getName())
                .code(h.getCode())
                .active(h.isActive())
                .grantAiSuggestion(h.isGrantAiSuggestion())
                .grantPathologyInput(h.isGrantPathologyInput())
                .grantAnnotationTool(h.isGrantAnnotationTool())
                .grantViewAnnotations(h.isGrantViewAnnotations())
                .grantImageGallery(h.isGrantImageGallery())
                .createdAt(h.getCreatedAt())
                .userCount(userRepository.countByHospital_Id(h.getId()))
                .build();
    }
}
