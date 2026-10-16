package com.thyroai.examination.dto;

import com.thyroai.ai.dto.AIScoreDTO;
import com.thyroai.imageseries.dto.ImageSeriesDTO;
import com.thyroai.pathology.dto.PathologyResultDTO;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ExaminationDTO {
    private UUID id;
    private UUID patientId;
    private LocalDate examinationDate;
    private String status;
    private List<ImageSeriesDTO> imageSeries;
    private AIScoreDTO aiScore;
    private PathologyResultDTO pathologyResult;
}
