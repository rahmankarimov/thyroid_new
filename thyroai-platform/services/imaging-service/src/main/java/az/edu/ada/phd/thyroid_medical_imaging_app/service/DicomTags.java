package az.edu.ada.phd.thyroid_medical_imaging_app.service;

import tools.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Null-safe readers for Orthanc's JSON tag blocks.
 *
 * <p>Orthanc omits tags that were absent from the DICOM object entirely, and emits an
 * empty string for tags that are present but blank (very common after anonymisation).
 * Both must read as "unknown" rather than blowing up or propagating "".
 */
final class DicomTags {

    private static final DateTimeFormatter DICOM_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private DicomTags() {}

    /** Reads {@code parent.child} as a trimmed string, or null when absent/blank. */
    static String text(JsonNode parent, String field) {
        if (parent == null) return null;
        JsonNode node = parent.get(field);
        if (node == null || node.isNull()) return null;
        String value = node.asString().trim();
        return value.isEmpty() ? null : value;
    }

    /** Reads a DICOM {@code yyyyMMdd} date and returns it as ISO {@code yyyy-MM-dd}. */
    static String isoDate(JsonNode parent, String field) {
        String raw = text(parent, field);
        if (raw == null) return null;
        try {
            return LocalDate.parse(raw, DICOM_DATE).toString();
        } catch (Exception e) {
            // Some modalities emit malformed or partial dates (e.g. "1985"). Dropping the
            // value is correct — ThyroAI falls back to the ingest date.
            return null;
        }
    }

    static Integer integer(JsonNode parent, String field) {
        String raw = text(parent, field);
        if (raw == null) return null;
        try {
            return Integer.valueOf(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
