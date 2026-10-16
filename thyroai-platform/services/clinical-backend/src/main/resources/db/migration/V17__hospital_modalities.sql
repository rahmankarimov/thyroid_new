CREATE TABLE hospital_modalities (
    id           UUID        NOT NULL PRIMARY KEY,
    hospital_id  UUID        NOT NULL,
    ae_title     VARCHAR(16) NOT NULL UNIQUE,   -- DICOM AE Titles are max 16 chars; globally
                                                -- unique because one physical device belongs
                                                -- to exactly one hospital
    station_name VARCHAR(64),                   -- optional (0008,1010), for multi-room clinics
    description  VARCHAR(255),
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_hm_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE INDEX idx_hm_hospital ON hospital_modalities (hospital_id);
