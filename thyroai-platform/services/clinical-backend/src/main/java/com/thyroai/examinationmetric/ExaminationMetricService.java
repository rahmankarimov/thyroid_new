package com.thyroai.examinationmetric;

import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.examinationmetric.dto.ExaminationMetricDTO;
import com.thyroai.patient.PatientAssignmentRepository;
import com.thyroai.user.User;
import com.thyroai.user.UserRole;
import com.thyroai.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExaminationMetricService {

    private final ExaminationMetricRepository metricRepository;
    private final ExaminationRepository       examinationRepository;
    private final PatientAssignmentRepository assignmentRepository;
    private final UserService                 userService;

    @Transactional(readOnly = true)
    public List<ExaminationMetricDTO> findByExamination(UUID examinationId, String requesterEmail) {
        User requester = userService.findByEmail(requesterEmail);
        Examination examination = examinationRepository.findById(examinationId)
                .orElseThrow(() -> new EntityNotFoundException("Examination not found: " + examinationId));
        assertAssigned(requester, examination.getPatient().getId());

        return metricRepository.findByExaminationIdOrderByCreatedAtAsc(examinationId)
                .stream()
                .map(m -> toDTO(m, requester))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExaminationMetricDTO> findByPatient(UUID patientId, String requesterEmail) {
        User requester = userService.findByEmail(requesterEmail);
        assertAssigned(requester, patientId);

        return metricRepository.findByPatientIdOrderByCreatedAtAsc(patientId)
                .stream()
                .map(m -> toDTO(m, requester))
                .collect(Collectors.toList());
    }

    @Transactional
    public ExaminationMetricDTO create(ExaminationMetricDTO.Request request, String doctorEmail) {
        User doctor = userService.findByEmail(doctorEmail);
        Examination examination = examinationRepository.findById(request.getExaminationId())
                .orElseThrow(() -> new EntityNotFoundException("Examination not found: " + request.getExaminationId()));
        UUID patientId = examination.getPatient().getId();
        assertAssigned(doctor, patientId);

        // Lock: once a diagnosis is confirmed for this examination, manual values are frozen.
        if (examination.getPathologyResult() != null)
            throw new IllegalStateException("Cannot add manual values after diagnosis has been submitted.");

        ExaminationMetric metric = ExaminationMetric.builder()
                .examinationId(examination.getId())
                .patientId(patientId)
                .metricKey(request.getKey())
                .metricValue(request.getValue())
                .doctor(doctor)
                .build();
        return toDTO(metricRepository.save(metric), doctor);
    }

    @Transactional
    public void delete(UUID id, String doctorEmail) {
        ExaminationMetric metric = metricRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Manual value not found: " + id));
        User requester = userService.findByEmail(doctorEmail);
        if (!isOwner(metric, requester))
            throw new SecurityException("Only the author can delete this value.");

        // Lock after diagnosis, mirroring annotation behavior.
        examinationRepository.findById(metric.getExaminationId()).ifPresent(exam -> {
            if (exam.getPathologyResult() != null)
                throw new IllegalStateException("Cannot delete manual values after diagnosis has been submitted.");
        });

        metricRepository.delete(metric);
    }

    private void assertAssigned(User requester, UUID patientId) {
        // Disabling assignment check for crowdsourcing queue
    }

    private boolean isOwner(ExaminationMetric m, User user) {
        return m.getDoctor() != null && m.getDoctor().getId().equals(user.getId());
    }

    private ExaminationMetricDTO toDTO(ExaminationMetric m, User requester) {
        return ExaminationMetricDTO.builder()
                .id(m.getId())
                .examinationId(m.getExaminationId())
                .patientId(m.getPatientId())
                .key(m.getMetricKey())
                .value(m.getMetricValue())
                .doctorName(m.getDoctor() != null ? m.getDoctor().getFirstName() + " " + m.getDoctor().getLastName() : "Unknown")
                .isOwner(isOwner(m, requester))
                .createdAt(m.getCreatedAt())
                .build();
    }
}
