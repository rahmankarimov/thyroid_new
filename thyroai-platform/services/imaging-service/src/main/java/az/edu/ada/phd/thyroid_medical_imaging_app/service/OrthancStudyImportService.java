package az.edu.ada.phd.thyroid_medical_imaging_app.service;

import az.edu.ada.phd.thyroid_medical_imaging_app.client.ThyroAiIngestClient;
import az.edu.ada.phd.thyroid_medical_imaging_app.dto.ThyroAiStudyPayload;
import az.edu.ada.phd.thyroid_medical_imaging_app.entity.DicomInstance;
import az.edu.ada.phd.thyroid_medical_imaging_app.entity.DicomStudy;
import az.edu.ada.phd.thyroid_medical_imaging_app.repository.DicomInstanceRepository;
import az.edu.ada.phd.thyroid_medical_imaging_app.repository.DicomStudyRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class OrthancStudyImportService {

    private final RestClient orthancClient;
    private final ObjectMapper objectMapper;
    private final ObjectStorageService storageService;
    private final DicomStudyRepository studyRepository;
    private final DicomInstanceRepository instanceRepository;
    private final ThyroAiIngestClient thyroAiIngestClient;

    public OrthancStudyImportService(
            // Qualified explicitly: there are now two RestClient beans (Orthanc and ThyroAI),
            // and the parameter name does not match either bean name.
            @Qualifier("orthancRestClient") RestClient orthancClient,
            ObjectMapper objectMapper,
            ObjectStorageService storageService,
            DicomStudyRepository studyRepository,
            DicomInstanceRepository instanceRepository,
            ThyroAiIngestClient thyroAiIngestClient
    ) {
        this.orthancClient = orthancClient;
        this.objectMapper = objectMapper;
        this.storageService = storageService;
        this.studyRepository = studyRepository;
        this.instanceRepository = instanceRepository;
        this.thyroAiIngestClient = thyroAiIngestClient;
    }

    @Transactional
    public void importStudy(String studyId) throws IOException {
        DicomStudy studyEntity = studyRepository
                .findByOrthancStudyId(studyId)
                .orElseGet(() -> studyRepository.save(new DicomStudy(studyId)));

        JsonNode studyJson = orthancClient.get()
                .uri("/studies/{id}", studyId)
                .retrieve()
                .body(JsonNode.class);

        log.info(studyJson.toString());

        String metadataKey = "studies/%s/metadata/study.json".formatted(studyId);

        storageService.upload(
                metadataKey,
                objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(studyJson),
                "application/json"
        );

        JsonNode seriesIds = studyJson.get("Series");

        if (seriesIds == null || !seriesIds.isArray()) {
            throw new IllegalStateException("No series found for study: " + studyId);
        }

        // Collected for the ThyroAI push. Previews are kept in memory rather than
        // re-fetched afterwards: this method is transactional, so a failed push rolls the
        // instance rows back and the whole import is replayed on redelivery.
        List<ThyroAiStudyPayload.Instance> payloadInstances = new ArrayList<>();
        Map<String, byte[]> previews = new LinkedHashMap<>();
        String modality = null;
        String sourceAeTitle = null;

        for (JsonNode seriesIdNode : seriesIds) {
            String seriesId = seriesIdNode.asString();

            JsonNode series = orthancClient.get()
                    .uri("/series/{id}", seriesId)
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode seriesTags = series.get("MainDicomTags");
            String seriesDescription = DicomTags.text(seriesTags, "SeriesDescription");
            if (modality == null) {
                modality = DicomTags.text(seriesTags, "Modality");
            }

            JsonNode instanceIds = series.get("Instances");

            for (JsonNode instanceIdNode : instanceIds) {
                String instanceId = instanceIdNode.asString();

                if (instanceRepository.existsByOrthancInstanceId(instanceId)) {
                    continue;
                }

                if (sourceAeTitle == null) {
                    sourceAeTitle = fetchRemoteAet(instanceId);
                }

                byte[] dicomBytes = orthancClient.get()
                        .uri("/instances/{id}/file", instanceId)
                        .retrieve()
                        .body(byte[].class);

                String dicomKey = "studies/%s/dicom/%s.dcm".formatted(studyId, instanceId);

                storageService.upload(
                        dicomKey,
                        dicomBytes,
                        "application/dicom"
                );

                String previewKey = null;
                String previewFilename = null;

                try {
                    byte[] previewBytes = orthancClient.get()
                            .uri("/instances/{id}/preview", instanceId)
                            .retrieve()
                            .body(byte[].class);

                    previewKey = "studies/%s/preview/%s.jpg".formatted(studyId, instanceId);

                    storageService.upload(
                            previewKey,
                            previewBytes,
                            "image/jpeg"
                    );

                    previewFilename = instanceId + ".jpg";
                    previews.put(previewFilename, previewBytes);

                } catch (Exception ex) {
                    log.warn("Preview not available for instance {}: {}", instanceId, ex.getMessage());
                }

                DicomInstance instanceEntity = new DicomInstance(
                        studyEntity,
                        instanceId,
                        dicomKey,
                        previewKey,
                        LocalDateTime.now()
                );

                instanceRepository.save(instanceEntity);

                payloadInstances.add(new ThyroAiStudyPayload.Instance(
                        instanceId,
                        seriesDescription,
                        fetchInstanceNumber(instanceId),
                        dicomKey,
                        previewFilename
                ));
            }
        }

        log.info("Study imported successfully: {}", studyId);

        if (payloadInstances.isEmpty()) {
            log.info("Study {} had no new instances; nothing to push to ThyroAI", studyId);
            return;
        }

        thyroAiIngestClient.push(
                buildPayload(studyId, studyJson, modality, sourceAeTitle, payloadInstances),
                previews
        );
    }

    private ThyroAiStudyPayload buildPayload(String studyId, JsonNode studyJson, String modality,
                                             String sourceAeTitle,
                                             List<ThyroAiStudyPayload.Instance> instances) {
        JsonNode studyTags = studyJson.get("MainDicomTags");
        JsonNode patientTags = studyJson.get("PatientMainDicomTags");

        return new ThyroAiStudyPayload(
                studyId,
                DicomTags.text(studyTags, "StudyInstanceUID"),
                DicomTags.text(studyTags, "AccessionNumber"),
                DicomTags.isoDate(studyTags, "StudyDate"),
                DicomTags.text(studyTags, "StudyDescription"),
                modality,
                sourceAeTitle,
                DicomTags.text(studyTags, "InstitutionName"),
                DicomTags.text(patientTags, "PatientID"),
                DicomTags.text(patientTags, "PatientName"),
                DicomTags.isoDate(patientTags, "PatientBirthDate"),
                DicomTags.text(patientTags, "PatientSex"),
                instances
        );
    }

    /**
     * The calling AE Title of the device that sent this instance. Orthanc records it as
     * per-instance metadata; it is how ThyroAI decides which hospital the study belongs to.
     */
    private String fetchRemoteAet(String instanceId) {
        try {
            String aet = orthancClient.get()
                    .uri("/instances/{id}/metadata/RemoteAET", instanceId)
                    .retrieve()
                    .body(String.class);
            return aet == null || aet.isBlank() ? null : aet.trim();
        } catch (Exception ex) {
            // Absent for instances uploaded through the REST API rather than C-STORE.
            log.warn("No RemoteAET metadata for instance {}: {}", instanceId, ex.getMessage());
            return null;
        }
    }

    private Integer fetchInstanceNumber(String instanceId) {
        try {
            JsonNode instance = orthancClient.get()
                    .uri("/instances/{id}", instanceId)
                    .retrieve()
                    .body(JsonNode.class);
            return DicomTags.integer(instance.get("MainDicomTags"), "InstanceNumber");
        } catch (Exception ex) {
            log.warn("Could not read InstanceNumber for instance {}: {}", instanceId, ex.getMessage());
            return null;
        }
    }
}
