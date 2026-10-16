package com.thyroai.patient;

import com.thyroai.ai.dto.AIScoreDTO;
import com.thyroai.examination.dto.ExaminationDTO;
import com.thyroai.imageseries.dto.ImageSeriesDTO;
import com.thyroai.patient.dto.PatientDTO;
import com.thyroai.pathology.dto.PathologyResultDTO;
import com.thyroai.user.User;
import com.thyroai.user.UserRepository;
import com.thyroai.user.UserRole;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    public Page<PatientDTO> findAll(String userEmail, String search, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userEmail));

        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
            if (user.getHospital() == null) return Page.empty(pageable);
            UUID hospitalId = user.getHospital().getId();
            Page<Patient> page = (search != null && !search.isBlank())
                    ? patientRepository.searchInHospital(hospitalId, search, pageable)
                    : patientRepository.findByHospital_Id(hospitalId, pageable);
            return page.map(this::toSummaryDTOWithAssignments);
        }

        // DOCTOR / ASSISTANT — only assigned patients
        List<Patient> patients = assignmentRepository.findPatientsByDoctorId(user.getId());
        List<PatientDTO> dtos = patients.stream().map(this::toSummaryDTO).collect(Collectors.toList());
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), dtos.size());
        List<PatientDTO> slice = start >= dtos.size() ? List.of() : dtos.subList(start, end);
        return new PageImpl<>(slice, pageable, dtos.size());
    }

    @Transactional
    public Patient create(String firstName, String lastName, String fin,
                          LocalDate dateOfBirth, String gender, String referredBy,
                          String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + adminEmail));

        // If same patient already registered in this hospital, return them so a new examination can be added
        if (admin.getHospital() != null) {
            java.util.Optional<Patient> existing = patientRepository.findByFinAndHospital_Id(fin, admin.getHospital().getId());
            if (existing.isPresent()) return existing.get();
        }

        return patientRepository.save(Patient.builder()
                .firstName(firstName).lastName(lastName).fin(fin)
                .dateOfBirth(dateOfBirth).gender(gender).referredBy(referredBy)
                .hospital(admin.getHospital())
                .build());
    }

    public PatientDTO findById(UUID id, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + requesterEmail));

        // Note: For crowdsourcing, any doctor can view any patient.
        // If strict assignment checking is needed for non-queue, add logic here later.

        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + id));
        return toFullDTO(patient);
    }

    @Transactional
    public void assignDoctors(UUID patientId, List<UUID> doctorIds, String adminEmail) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + patientId));
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + adminEmail));

        assignmentRepository.deleteByPatient_Id(patientId);

        List<PatientAssignment> assignments = doctorIds.stream().map(doctorId -> {
            User doctor = userRepository.findById(doctorId)
                    .orElseThrow(() -> new EntityNotFoundException("Doctor not found: " + doctorId));
            return PatientAssignment.builder()
                    .patient(patient)
                    .doctor(doctor)
                    .assignedBy(admin)
                    .build();
        }).collect(Collectors.toList());

        assignmentRepository.saveAll(assignments);
    }

    public List<UUID> getAssignedDoctorIds(UUID patientId) {
        return assignmentRepository.findByPatient_Id(patientId)
                .stream()
                .map(a -> a.getDoctor().getId())
                .collect(Collectors.toList());
    }

    private PatientDTO toSummaryDTOWithAssignments(Patient p) {
        List<UUID> assignedIds = assignmentRepository.findByPatient_Id(p.getId())
                .stream().map(a -> a.getDoctor().getId()).collect(Collectors.toList());
        PatientDTO dto = buildSummaryDTO(p);
        dto.setAssignedDoctorIds(assignedIds);
        return dto;
    }

    private PatientDTO toSummaryDTO(Patient p) {
        return buildSummaryDTO(p);
    }

    private PatientDTO buildSummaryDTO(Patient p) {
        List<ExaminationDTO> exams = p.getExaminations().stream().map(e -> {
            ExaminationDTO.ExaminationDTOBuilder b = ExaminationDTO.builder()
                    .id(e.getId())
                    .patientId(p.getId())
                    .examinationDate(e.getExaminationDate())
                    .status(e.getStatus());
            if (e.getAiScore() != null) {
                b.aiScore(AIScoreDTO.builder()
                        .id(e.getAiScore().getId())
                        .examinationId(e.getId())
                        .malignancyProbability(e.getAiScore().getMalignancyProbability())
                        .tiradsScore(e.getAiScore().getTiradsScore())
                        .justification(e.getAiScore().getJustification())
                        .build());
            }
            if (e.getPathologyResult() != null) {
                b.pathologyResult(PathologyResultDTO.builder()
                        .id(e.getPathologyResult().getId())
                        .examinationId(e.getId())
                        .diagnosis(e.getPathologyResult().getDiagnosis())
                        .confirmedAt(e.getPathologyResult().getConfirmedAt())
                        .confirmedBy(e.getPathologyResult().getConfirmedBy() != null
                                ? e.getPathologyResult().getConfirmedBy().getEmail() : null)
                        .build());
            }
            return b.build();
        }).collect(Collectors.toList());

        return PatientDTO.builder()
                .id(p.getId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .fin(p.getFin())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .referredBy(p.getReferredBy())
                .examinations(exams)
                .build();
    }

    private PatientDTO toFullDTO(Patient p) {
        return PatientDTO.builder()
                .id(p.getId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .fin(p.getFin())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .referredBy(p.getReferredBy())
                .examinations(p.getExaminations().stream().map(e -> ExaminationDTO.builder()
                        .id(e.getId())
                        .patientId(p.getId())
                        .examinationDate(e.getExaminationDate())
                        .status(e.getStatus())
                        .imageSeries(e.getImageSeries().stream().map(s -> ImageSeriesDTO.builder()
                                .id(s.getId())
                                .examinationId(e.getId())
                                .label(s.getLabel())
                                .thumbnailUrl(s.getThumbnailUrl())
                                .fullUrl(s.getFullUrl())
                                .build()).collect(Collectors.toList()))
                        .aiScore(e.getAiScore() == null ? null : AIScoreDTO.builder()
                                .id(e.getAiScore().getId())
                                .examinationId(e.getId())
                                .malignancyProbability(e.getAiScore().getMalignancyProbability())
                                .tiradsScore(e.getAiScore().getTiradsScore())
                                .justification(e.getAiScore().getJustification())
                                .build())
                        .pathologyResult(e.getPathologyResult() == null ? null : PathologyResultDTO.builder()
                                .id(e.getPathologyResult().getId())
                                .examinationId(e.getId())
                                .diagnosis(e.getPathologyResult().getDiagnosis())
                                .notes(e.getPathologyResult().getNotes())
                                .confirmedBy(e.getPathologyResult().getConfirmedBy() != null
                                        ? e.getPathologyResult().getConfirmedBy().getEmail() : null)
                                .confirmedAt(e.getPathologyResult().getConfirmedAt())
                                .build())
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
