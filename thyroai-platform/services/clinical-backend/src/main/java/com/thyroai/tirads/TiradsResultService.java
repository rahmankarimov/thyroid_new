package com.thyroai.tirads;


import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.tirads.dto.CreateTiradsResultRequest;
import com.thyroai.tirads.dto.TiradsResultDTO;
import com.thyroai.user.User;
import com.thyroai.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TiradsResultService {

    private final TiradsResultRepository repository;
    private final ExaminationRepository examinationRepository;
    private final UserRepository userRepository;

    @Transactional
    public TiradsResultDTO create(UUID examinationId, CreateTiradsResultRequest request) {
        Examination exam = examinationRepository.findById(examinationId)
                .orElseThrow(() -> new IllegalArgumentException("Examination not found"));

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);

        TiradsResult result = TiradsResult.builder()
                .examination(exam)
                .totalPoints(request.getTotalPoints())
                .level(request.getLevel())
                .composition(request.getComposition())
                .echogenicity(request.getEchogenicity())
                .shape(request.getShape())
                .margin(request.getMargin())
                .echogenicFoci(request.getEchogenicFoci())
                .createdBy(currentUser)
                .build();

        result = repository.save(result);
        
        long count = repository.findByExaminationIdOrderByCreatedAtDesc(examinationId).size();
        if (count >= 3) {
            exam.setStatus("COMPLETED");
            examinationRepository.save(exam);
        }

        return toDto(result);
    }

    @Transactional(readOnly = true)
    public List<TiradsResultDTO> getByExamination(UUID examinationId) {
        return repository.findByExaminationIdOrderByCreatedAtDesc(examinationId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private TiradsResultDTO toDto(TiradsResult entity) {
        return TiradsResultDTO.builder()
                .id(entity.getId())
                .examinationId(entity.getExamination().getId())
                .totalPoints(entity.getTotalPoints())
                .level(entity.getLevel())
                .composition(entity.getComposition())
                .echogenicity(entity.getEchogenicity())
                .shape(entity.getShape())
                .margin(entity.getMargin())
                .echogenicFoci(entity.getEchogenicFoci())
                .createdAt(entity.getCreatedAt())
                .createdById(entity.getCreatedBy() != null ? entity.getCreatedBy().getId() : null)
                .createdByName(entity.getCreatedBy() != null ? entity.getCreatedBy().getFirstName() + " " + entity.getCreatedBy().getLastName() : null)
                .build();
    }
}
