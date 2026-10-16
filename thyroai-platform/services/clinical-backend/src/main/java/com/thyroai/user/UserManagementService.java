package com.thyroai.user;

import com.thyroai.role.Role;
import com.thyroai.role.RoleRepository;
import com.thyroai.user.dto.CreateUserRequest;
import com.thyroai.user.dto.UpdateUserRequest;
import com.thyroai.user.dto.UserPermissionDTO;
import com.thyroai.user.dto.UserWithPermissionsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;
    private final UserPermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserWithPermissionsDTO> findAllForAdmin(String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        if (admin.getHospital() == null) return List.of();
        return userRepository.findByHospital_Id(admin.getHospital().getId()).stream()
                .filter(u -> u.getRole() != UserRole.SUPER_ADMIN && u.getRole() != UserRole.ADMIN)
                .map(this::toWithPermissions)
                .toList();
    }

    @Transactional
    public UserWithPermissionsDTO create(CreateUserRequest req, String adminEmail) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already in use: " + req.getEmail());
        }
        if (req.getRole() == UserRole.ADMIN || req.getRole() == UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Administrators must be created by the super admin.");
        }
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        Role customRole = req.getCustomRoleId() != null
                ? roleRepository.findById(req.getCustomRoleId()).orElse(null)
                : null;

        User user = userRepository.save(User.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .role(req.getRole() != null ? req.getRole() : UserRole.DOCTOR)
                .customRole(customRole)
                .hospital(admin.getHospital())
                .active(true)
                .build());

        UserPermission perm = permissionRepository.save(UserPermission.builder().user(user).build());
        return buildDTO(user, perm);
    }

    @Transactional
    public UserWithPermissionsDTO update(UUID id, UpdateUserRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN)
            throw new IllegalArgumentException("Cannot modify an administrator account.");
        if (req.getFirstName() != null) user.setFirstName(req.getFirstName());
        if (req.getLastName() != null) user.setLastName(req.getLastName());
        if (req.getRole() != null) user.setRole(req.getRole());
        if (req.getActive() != null) user.setActive(req.getActive());
        if (Boolean.TRUE.equals(req.getClearCustomRole())) {
            user.setCustomRole(null);
        } else if (req.getCustomRoleId() != null) {
            roleRepository.findById(req.getCustomRoleId()).ifPresent(user::setCustomRole);
        }
        return toWithPermissions(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(UUID id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN)
            throw new IllegalArgumentException("Cannot modify an administrator account.");
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void changeMyPassword(String email, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        permissionRepository.findByUser_Id(user.getId()).ifPresent(perm -> {
            perm.setMustChangePassword(false);
            permissionRepository.save(perm);
        });
    }

    @Transactional
    public void delete(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN)
            throw new IllegalArgumentException("Cannot delete an administrator account.");
        permissionRepository.findByUser_Id(id).ifPresent(permissionRepository::delete);
        userRepository.deleteById(id);
    }

    public UserPermissionDTO getPermissions(UUID userId) {
        return permissionRepository.findByUser_Id(userId)
                .map(this::toPermissionDTO)
                .orElse(defaultPermissions(userId));
    }

    @Transactional
    public UserPermissionDTO updatePermissions(UUID userId, UserPermissionDTO req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN)
            throw new IllegalArgumentException("Cannot modify an administrator account.");
        UserPermission perm = permissionRepository.findByUser_Id(userId)
                .orElseGet(() -> UserPermission.builder().user(user).build());

        perm.setCanAnnotate(req.isCanAnnotate());
        perm.setCanViewAnnotations(req.isCanViewAnnotations());
        perm.setCanSubmitDiagnosis(req.isCanSubmitDiagnosis());
        perm.setCanSeeAi(req.isCanSeeAi());
        perm.setCanSeeGallery(req.isCanSeeGallery());
        perm.setActive(req.isActive());
        perm.setMustChangePassword(req.isMustChangePassword());
        perm.setCanSeePatients(req.isCanSeePatients());

        return toPermissionDTO(permissionRepository.save(perm));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    public UserPermission ensurePermissions(User user) {
        return permissionRepository.findByUser_Id(user.getId())
                .orElseGet(() -> permissionRepository.save(
                        UserPermission.builder().user(user).build()));
    }

    private UserWithPermissionsDTO toWithPermissions(User user) {
        UserPermission perm = permissionRepository.findByUser_Id(user.getId())
                .orElseGet(() -> permissionRepository.save(
                        UserPermission.builder().user(user).build()));
        return buildDTO(user, perm);
    }

    private UserWithPermissionsDTO buildDTO(User user, UserPermission perm) {
        return UserWithPermissionsDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .active(user.isActive())
                .customRoleName(user.getCustomRole() != null ? user.getCustomRole().getName() : null)
                .permissions(toPermissionDTO(perm))
                .build();
    }

    private UserPermissionDTO toPermissionDTO(UserPermission p) {
        return UserPermissionDTO.builder()
                .userId(p.getUser().getId())
                .canAnnotate(p.isCanAnnotate())
                .canViewAnnotations(p.isCanViewAnnotations())
                .canSubmitDiagnosis(p.isCanSubmitDiagnosis())
                .canSeeAi(p.isCanSeeAi())
                .canSeeGallery(p.isCanSeeGallery())
                .active(p.isActive())
                .mustChangePassword(p.isMustChangePassword())
                .canSeePatients(p.isCanSeePatients())
                .build();
    }

    private UserPermissionDTO defaultPermissions(UUID userId) {
        return UserPermissionDTO.builder()
                .userId(userId)
                .canAnnotate(true).canViewAnnotations(true).canSubmitDiagnosis(true)
                .canSeeAi(true).canSeeGallery(true).active(true)
                .mustChangePassword(false).canSeePatients(false)
                .build();
    }
}
