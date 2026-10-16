package com.thyroai.examination;

import com.thyroai.ai.dto.AIScoreDTO;
import com.thyroai.examination.dto.ExaminationDTO;
import com.thyroai.imageseries.dto.ImageSeriesDTO;
import com.thyroai.pathology.dto.PathologyResultDTO;
import com.thyroai.patient.Patient;
import com.thyroai.patient.PatientRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExaminationService {

    private final ExaminationRepository examinationRepository;
    private final PatientRepository     patientRepository;

    @Transactional
    public ExaminationDTO create(UUID patientId, LocalDate examinationDate) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + patientId));
        Examination exam = examinationRepository.save(Examination.builder()
                .patient(patient)
                .examinationDate(examinationDate)
                .build());
        return toDTO(exam);
    }

    public List<ExaminationDTO> findByPatientId(UUID patientId) {
        return examinationRepository.findByPatientId(patientId).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    public ExaminationDTO findById(UUID id) {
        return examinationRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new EntityNotFoundException("Examination not found: " + id));
    }

    private ExaminationDTO toDTO(Examination e) {
        return ExaminationDTO.builder()
                .id(e.getId())
                .patientId(e.getPatient() != null ? e.getPatient().getId() : null)
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
                        .confirmedBy(e.getPathologyResult().getConfirmedBy() != null ? e.getPathologyResult().getConfirmedBy().getEmail() : null)
                        .confirmedAt(e.getPathologyResult().getConfirmedAt())
                        .build())
                .build();
    }
}
