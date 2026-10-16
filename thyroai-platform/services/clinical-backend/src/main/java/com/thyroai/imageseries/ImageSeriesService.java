package com.thyroai.imageseries;

import com.thyroai.config.CloudinaryStorageService;
import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.imageseries.dto.ImageSeriesDTO;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ImageSeriesService {

    private final ImageSeriesRepository imageSeriesRepository;
    private final ExaminationRepository examinationRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    @Value("${thyroai.images.upload-dir:./uploads/images}")
    private String uploadDir;

    public List<ImageSeriesDTO> findByExaminationId(UUID examinationId) {
        return imageSeriesRepository.findByExaminationId(examinationId).stream()
                .map(s -> ImageSeriesDTO.builder()
                        .id(s.getId())
                        .examinationId(s.getExamination().getId())
                        .label(s.getLabel())
                        .thumbnailUrl(s.getThumbnailUrl())
                        .fullUrl(s.getFullUrl())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Stores raw image bytes and returns the URL they are served from — Cloudinary when
     * configured, otherwise the local upload dir exposed at {@code /images/**}.
     *
     * <p>Shared by the manual admin upload below and by DICOM ingest, so both paths
     * produce identically-shaped {@link ImageSeries} rows.
     */
    public String storeBytes(String filename, byte[] data) throws IOException {
        if (cloudinaryStorageService.isEnabled()) {
            return cloudinaryStorageService.upload(filename, data);
        }
        Path dir = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(dir);
        Files.write(dir.resolve(filename), data);
        return "/images/" + filename;
    }

    @Transactional
    public ImageSeriesDTO upload(UUID examinationId, String label, MultipartFile file) {
        Examination examination = examinationRepository.findById(examinationId)
                .orElseThrow(() -> new EntityNotFoundException("Examination not found: " + examinationId));

        try {
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }
            String filename = UUID.randomUUID() + ext;
            String url = storeBytes(filename, file.getBytes());

            ImageSeries series = imageSeriesRepository.save(ImageSeries.builder()
                    .examination(examination)
                    .label(label != null && !label.isBlank() ? label : originalFilename != null ? originalFilename : filename)
                    .fullUrl(url)
                    .thumbnailUrl(url)
                    .build());

            return ImageSeriesDTO.builder()
                    .id(series.getId())
                    .examinationId(examinationId)
                    .label(series.getLabel())
                    .thumbnailUrl(series.getThumbnailUrl())
                    .fullUrl(series.getFullUrl())
                    .build();
        } catch (IOException e) {
            throw new RuntimeException("Failed to store image: " + e.getMessage(), e);
        }
    }
}
