package com.thyroai.dicom;

public enum DicomIngestStatus {
    /** Hospital or patient could not be resolved — waiting for an admin in the DICOM inbox. */
    UNMATCHED,
    /** Resolved automatically at ingest time; Examination created. */
    MATCHED,
    /** Resolved by an admin from the inbox; Examination created. */
    LINKED,
    /** Rejected by an admin. The original DICOM stays in the pipeline archive. */
    DISCARDED
}
