package com.thyroai.ai;

import com.thyroai.ai.dto.AIScoreDTO;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AIScoreService {

    private final AIScoreRepository aiScoreRepository;

    public AIScoreDTO findByExaminationId(UUID examinationId) {
        return aiScoreRepository.findByExaminationId(examinationId)
                .map(a -> AIScoreDTO.builder()
                        .id(a.getId())
                        .examinationId(examinationId)
                        .malignancyProbability(a.getMalignancyProbability())
                        .tiradsScore(a.getTiradsScore())
                        .justification(a.getJustification())
                        .build())
                .orElseThrow(() -> new EntityNotFoundException("AI score not found for examination: " + examinationId));
    }
}
