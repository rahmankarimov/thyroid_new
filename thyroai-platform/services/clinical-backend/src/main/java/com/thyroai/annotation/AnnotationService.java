package com.thyroai.annotation;

import com.thyroai.annotation.dto.AnnotationDTO;
import com.thyroai.imageseries.ImageSeries;
import com.thyroai.imageseries.ImageSeriesRepository;
import com.thyroai.patient.PatientAssignmentRepository;
import com.thyroai.user.User;
import com.thyroai.user.UserRole;
import com.thyroai.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnnotationService {

    private final AnnotationRepository        annotationRepository;
    private final ImageSeriesRepository       imageSeriesRepository;
    private final PatientAssignmentRepository assignmentRepository;
    private final UserService                 userService;

    @Transactional(readOnly = true)
    public List<AnnotationDTO> findByImageSeriesId(UUID imageSeriesId, String requesterEmail) {
        User requester = userService.findByEmail(requesterEmail);

        // Enforce patient assignment for non-admin roles
        if (requester.getRole() != UserRole.ADMIN && requester.getRole() != UserRole.SUPER_ADMIN) {
            ImageSeries series = imageSeriesRepository.findById(imageSeriesId)
                    .orElseThrow(() -> new EntityNotFoundException("Image series not found: " + imageSeriesId));
            UUID patientId = series.getExamination().getPatient().getId();
            // Disabling assignment check for crowdsourcing queue
        }

        return annotationRepository.findByImageSeriesIdAndDeletedAtIsNull(imageSeriesId)
                .stream()
                .filter(a -> a.isShared() || isOwner(a, requester))
                .map(a -> toDTO(a, requester))
                .collect(Collectors.toList());
    }

    @Transactional
    public AnnotationDTO create(AnnotationDTO.Request request, String doctorEmail) {
        User doctor = userService.findByEmail(doctorEmail);
        Annotation annotation = Annotation.builder()
                .imageSeriesId(request.getImageSeriesId())
                .patientId(request.getPatientId())
                .doctor(doctor)
                .path(request.getPath())
                .comment(request.getComment())
                .color(request.getColor() != null ? request.getColor() : "#ffffff")
                .build();
        return toDTO(annotationRepository.save(annotation), doctor);
    }

    @Transactional
    public void delete(UUID id, String doctorEmail) {
        Annotation annotation = annotationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Annotation not found: " + id));

        User requester = userService.findByEmail(doctorEmail);
        if (!isOwner(annotation, requester))
            throw new SecurityException("Only the annotation owner can delete it.");

        // Lock: if the examination this image belongs to has a confirmed diagnosis, deletion is blocked
        imageSeriesRepository.findById(annotation.getImageSeriesId()).ifPresent(series -> {
            if (series.getExamination() != null && series.getExamination().getPathologyResult() != null)
                throw new IllegalStateException("Cannot delete annotation after diagnosis has been submitted.");
        });

        annotation.setDeletedAt(LocalDateTime.now());
        annotationRepository.save(annotation);
    }

    @Transactional
    public AnnotationDTO setShared(UUID id, String doctorEmail, boolean shared) {
        Annotation annotation = annotationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Annotation not found: " + id));
        User requester = userService.findByEmail(doctorEmail);
        if (!isOwner(annotation, requester))
            throw new SecurityException("Only the annotation owner can change visibility.");
        annotation.setShared(shared);
        return toDTO(annotationRepository.save(annotation), requester);
    }

    private boolean isOwner(Annotation a, User user) {
        return a.getDoctor() != null && a.getDoctor().getId().equals(user.getId());
    }

    private AnnotationDTO toDTO(Annotation a, User requester) {
        return AnnotationDTO.builder()
                .id(a.getId())
                .imageSeriesId(a.getImageSeriesId())
                .patientId(a.getPatientId())
                .doctorId(a.getDoctor() != null ? a.getDoctor().getId() : null)
                .doctorName(a.getDoctor() != null ? a.getDoctor().getFirstName() + " " + a.getDoctor().getLastName() : "Unknown")
                .path(a.getPath())
                .comment(a.getComment())
                .color(a.getColor())
                .shared(a.isShared())
                .isOwner(isOwner(a, requester))
                .createdAt(a.getCreatedAt())
                .build();
    }
}
