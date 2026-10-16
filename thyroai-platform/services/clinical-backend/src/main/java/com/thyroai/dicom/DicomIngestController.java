package com.thyroai.dicom;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thyroai.common.ApiResponse;
import com.thyroai.dicom.dto.DicomStudyDTO;
import com.thyroai.dicom.dto.DicomStudyIngestRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Machine-to-machine entry point for the imaging pipeline.
 *
 * <p>Authenticated by shared secret in {@code X-Ingest-Key}, checked by
 * {@link com.thyroai.config.DicomIngestAuthFilter} — not by JWT, since the caller is a
 * service rather than a logged-in user.
 */
@RestController
@RequestMapping("/api/v1/dicom")
@Tag(name = "DICOM Ingest")
@RequiredArgsConstructor
public class DicomIngestController {

    private final DicomIngestService ingestService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Ingest a DICOM study received by the imaging pipeline (service key auth)")
    @PostMapping(value = "/ingest", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DicomStudyDTO>> ingest(
            @RequestPart("study") String studyJson,
            @RequestPart(value = "preview", required = false) MultipartFile[] previews) throws IOException {

        // Read the JSON part as a string rather than binding it directly: pipeline clients
        // vary in whether they set a Content-Type on the part, and an absent/incorrect one
        // makes Spring reject the @RequestPart before it reaches us.
        DicomStudyIngestRequest request =
                objectMapper.readValue(studyJson, DicomStudyIngestRequest.class);

        DicomStudyDTO result = ingestService.ingest(
                request, DicomIngestService.indexByFilename(previews));
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
