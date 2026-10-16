package az.edu.ada.phd.thyroid_medical_imaging_app.client;

import az.edu.ada.phd.thyroid_medical_imaging_app.dto.ThyroAiStudyPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

/**
 * Pushes an imported study to ThyroAI so it becomes a clinical record.
 *
 * <p>This service owns the DICOM archive; ThyroAI owns patients, examinations and
 * images the doctors actually read. Everything ThyroAI needs to resolve tenancy and
 * identity is sent here in one multipart call.
 */
@Component
@Slf4j
public class ThyroAiIngestClient {

    private final RestClient thyroAiClient;
    private final ObjectMapper objectMapper;
    private final String ingestKey;
    private final boolean enabled;

    public ThyroAiIngestClient(
            @Qualifier("thyroAiRestClient") RestClient thyroAiClient,
            ObjectMapper objectMapper,
            @Value("${thyroai.ingest-key:}") String ingestKey,
            @Value("${thyroai.enabled:true}") boolean enabled
    ) {
        this.thyroAiClient = thyroAiClient;
        this.objectMapper = objectMapper;
        this.ingestKey = ingestKey;
        this.enabled = enabled;
    }

    /**
     * @param previews rendered JPEG bytes keyed by the filename referenced in the payload
     * @throws org.springframework.web.client.RestClientException on any non-2xx response,
     *         so the caller can nack the message and let it retry
     */
    public void push(ThyroAiStudyPayload payload, Map<String, byte[]> previews) {
        if (!enabled) {
            log.info("ThyroAI ingest disabled; skipping push for study {}", payload.orthancStudyId());
            return;
        }
        if (ingestKey == null || ingestKey.isBlank()) {
            throw new IllegalStateException(
                    "THYROAI_INGEST_KEY is not configured — cannot push study " + payload.orthancStudyId());
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("study", jsonPart(objectMapper.writeValueAsString(payload)));

        previews.forEach((filename, bytes) -> body.add("preview", jpegPart(filename, bytes)));

        thyroAiClient.post()
                .uri("/api/v1/dicom/ingest")
                .header("X-Ingest-Key", ingestKey)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .toBodilessEntity();

        log.info("Pushed study {} to ThyroAI ({} preview(s))",
                payload.orthancStudyId(), previews.size());
    }

    private org.springframework.http.HttpEntity<String> jsonPart(String json) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new org.springframework.http.HttpEntity<>(json, headers);
    }

    private org.springframework.http.HttpEntity<Resource> jpegPart(String filename, byte[] bytes) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_JPEG);
        // The filename is how ThyroAI pairs this part with its instance in the payload.
        Resource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        return new org.springframework.http.HttpEntity<>(resource, headers);
    }
}
