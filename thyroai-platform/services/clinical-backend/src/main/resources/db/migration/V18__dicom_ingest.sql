CREATE TABLE dicom_studies (
    id                 UUID         NOT NULL PRIMARY KEY,
    orthanc_study_id   VARCHAR(64)  NOT NULL UNIQUE,   -- idempotency key: RabbitMQ redelivers
    study_instance_uid VARCHAR(128) NOT NULL UNIQUE,   -- (0020,000D), stable across re-imports
    accession_number   VARCHAR(64),
    study_date         DATE,
    study_description  VARCHAR(255),
    modality           VARCHAR(16),

    dicom_patient_id   VARCHAR(64),
    dicom_patient_name VARCHAR(255),
    dicom_birth_date   DATE,
    dicom_sex          VARCHAR(16),
    source_ae_title    VARCHAR(16),
    institution_name   VARCHAR(255),

    status             VARCHAR(32)  NOT NULL DEFAULT 'UNMATCHED',  -- UNMATCHED|MATCHED|LINKED|DISCARDED
    unmatched_reason   VARCHAR(255),
    hospital_id        UUID,
    patient_id         UUID,
    examination_id     UUID,
    resolved_by        UUID,                            -- admin who linked/discarded it
    resolved_at        TIMESTAMP,
    received_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ds_hospital FOREIGN KEY (hospital_id)    REFERENCES hospitals(id),
    CONSTRAINT fk_ds_patient  FOREIGN KEY (patient_id)     REFERENCES patients(id),
    CONSTRAINT fk_ds_exam     FOREIGN KEY (examination_id) REFERENCES examinations(id),
    CONSTRAINT fk_ds_user     FOREIGN KEY (resolved_by)    REFERENCES users(id)
);

CREATE INDEX idx_ds_hospital_status ON dicom_studies (hospital_id, status);

CREATE TABLE dicom_instances (
    id                  UUID         NOT NULL PRIMARY KEY,
    dicom_study_id      UUID         NOT NULL,
    orthanc_instance_id VARCHAR(64)  NOT NULL UNIQUE,
    series_description  VARCHAR(255),
    instance_number     INTEGER,
    preview_url         VARCHAR(2000),   -- Cloudinary / /images URL of the rendered JPEG
    archive_object_key  VARCHAR(512),    -- object key of the original .dcm in the pipeline archive
    image_series_id     UUID,            -- set once materialised into an Examination
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_di_study  FOREIGN KEY (dicom_study_id)  REFERENCES dicom_studies(id) ON DELETE CASCADE,
    CONSTRAINT fk_di_series FOREIGN KEY (image_series_id) REFERENCES image_series(id)
);

CREATE INDEX idx_di_study ON dicom_instances (dicom_study_id);

ALTER TABLE examinations ADD COLUMN source VARCHAR(32) NOT NULL DEFAULT 'MANUAL';  -- MANUAL|DICOM
