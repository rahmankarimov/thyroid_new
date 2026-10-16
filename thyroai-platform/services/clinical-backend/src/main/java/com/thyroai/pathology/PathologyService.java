package com.thyroai.pathology;

import com.thyroai.common.AuditAction;
import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.pathology.dto.PathologyResultDTO;
import com.thyroai.user.User;
import com.thyroai.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PathologyService {

    private final PathologyRepository pathologyRepository;
    private final ExaminationRepository examinationRepository;
    private final UserService userService;

    public PathologyResultDTO findByExaminationId(UUID examinationId) {
        return pathologyRepository.findByExaminationId(examinationId)
                .map(this::toDTO)
                .orElse(null);
    }

    @Transactional
    public PathologyResultDTO submit(PathologyResultDTO.Request request, String doctorEmail) {
        User doctor = userService.findByEmail(doctorEmail);
        Examination examination = examinationRepository.findById(request.getExaminationId())
                .orElseThrow(() -> new EntityNotFoundException("Examination not found: " + request.getExaminationId()));

        PathologyResult result = pathologyRepository.findByExaminationId(examination.getId())
                .orElse(PathologyResult.builder().examination(examination).build());

        result.setDiagnosis(request.getDiagnosis());
        result.setNotes(request.getNotes());
        result.setConfirmedBy(doctor);
        result.setConfirmedAt(LocalDateTime.now());

        examination.setStatus("DIAGNOSIS_CONFIRMED");
        examinationRepository.save(examination);

        PathologyResult saved = pathologyRepository.save(result);
        return toDTO(saved);
    }

    private PathologyResultDTO toDTO(PathologyResult r) {
        return PathologyResultDTO.builder()
                .id(r.getId())
                .examinationId(r.getExamination() != null ? r.getExamination().getId() : null)
                .diagnosis(r.getDiagnosis())
                .notes(r.getNotes())
                .confirmedBy(confirmedByName(r.getConfirmedBy()))
                .confirmedAt(r.getConfirmedAt())
                .approvedForRetraining(r.isApprovedForRetraining())
                .build();
    }

    private String confirmedByName(com.thyroai.user.User user) {
        if (user == null) return null;
        String fullName = ((user.getFirstName() != null ? user.getFirstName() : "") + " "
                + (user.getLastName() != null ? user.getLastName() : "")).trim();
        return !fullName.isEmpty() ? fullName : user.getEmail();
    }
}
