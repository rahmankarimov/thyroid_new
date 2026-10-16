package az.edu.ada.phd.thyroid_medical_imaging_app.dto;

import java.util.List;

/**
 * The {@code study} part of the multipart POST to ThyroAI's /api/v1/dicom/ingest.
 *
 * <p>Carries the DICOM identity ThyroAI needs to resolve a hospital (via the sending
 * device's AE Title) and a patient (via PatientID, which carries the FIN). The rendered
 * preview JPEGs travel alongside as repeated {@code preview} parts, matched by
 * {@link Instance#previewFilename()}.
 *
 * <p>Dates are ISO {@code yyyy-MM-dd}, already converted from DICOM's {@code yyyyMMdd}.
 */
public record ThyroAiStudyPayload(
        String orthancStudyId,
        String studyInstanceUid,
        String accessionNumber,
        String studyDate,
        String studyDescription,
        String modality,
        String sourceAeTitle,
        String institutionName,
        String dicomPatientId,
        String dicomPatientName,
        String dicomBirthDate,
        String dicomSex,
        List<Instance> instances
) {
    public record Instance(
            String orthancInstanceId,
            String seriesDescription,
            Integer instanceNumber,
            String archiveObjectKey,
            String previewFilename
    ) {}
}
