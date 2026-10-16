-- ============================================================
-- V2 — Clinical Data: Patients, Examinations, and Results
--
-- Core medical data. A patient has one or more examinations.
-- Each examination has: a set of image series (ultrasound views),
-- an AI-generated score, and optionally a confirmed pathology
-- result entered by the doctor.
-- ============================================================


-- ------------------------------------------------------------
-- Patients
-- fin is the unique national ID (up to 7 chars in Azerbaijan).
-- ------------------------------------------------------------
CREATE TABLE patients (
    id            UUID         NOT NULL PRIMARY KEY,
    first_name    VARCHAR(255) NOT NULL,
    last_name     VARCHAR(255) NOT NULL,
    fin           VARCHAR(7)   NOT NULL UNIQUE,    -- National ID — must be unique across all patients
    date_of_birth DATE,
    gender        VARCHAR(50),
    referred_by   VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- Examinations
-- One examination represents a single ultrasound session.
-- Status lifecycle: PENDING_REVIEW → COMPLETED
-- ------------------------------------------------------------
CREATE TABLE examinations (
    id               UUID        NOT NULL PRIMARY KEY,
    patient_id       UUID        NOT NULL,
    examination_date DATE        NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',

    CONSTRAINT fk_exam_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);


-- ------------------------------------------------------------
-- Image Series
-- Each examination has multiple views (Transverse, Longitudinal,
-- Doppler). Both a thumbnail and full-resolution URL are stored
-- so the gallery can show previews without loading full images.
-- ------------------------------------------------------------
CREATE TABLE image_series (
    id             UUID          NOT NULL PRIMARY KEY,
    examination_id UUID          NOT NULL,
    label          VARCHAR(255)  NOT NULL,          -- e.g. "Transverse View"
    thumbnail_url  VARCHAR(2000),                   -- Low-res for gallery sidebar
    full_url       VARCHAR(2000),                   -- Full-res for the main viewer
    uploaded_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_image_series_exam FOREIGN KEY (examination_id) REFERENCES examinations(id)
);


-- ------------------------------------------------------------
-- AI Scores
-- One-to-one with examination. Generated automatically when
-- images are uploaded. malignancy_probability is a 0–1 float.
-- tirads_score maps to TR2/TR3/TR4/TR5 classification.
-- ------------------------------------------------------------
CREATE TABLE ai_scores (
    id                     UUID             NOT NULL PRIMARY KEY,
    examination_id         UUID             NOT NULL UNIQUE,   -- One AI score per examination
    malignancy_probability DOUBLE PRECISION NOT NULL,
    tirads_score           VARCHAR(50)      NOT NULL,
    justification          VARCHAR(2000),                      -- Human-readable explanation from the model
    generated_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ai_score_exam FOREIGN KEY (examination_id) REFERENCES examinations(id)
);


-- ------------------------------------------------------------
-- Pathology Results
-- Optional — filled in by a doctor after biopsy/FNA results.
-- approved_for_retraining flags this case for inclusion in
-- future AI model training batches.
-- ------------------------------------------------------------
CREATE TABLE pathology_results (
    id                      UUID         NOT NULL PRIMARY KEY,
    examination_id          UUID         NOT NULL UNIQUE,       -- One result per examination
    diagnosis               VARCHAR(255) NOT NULL,
    notes                   TEXT,
    confirmed_by            UUID,                               -- The doctor who submitted the result
    confirmed_at            TIMESTAMP,
    approved_for_retraining BOOLEAN      NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_pathology_exam FOREIGN KEY (examination_id) REFERENCES examinations(id),
    CONSTRAINT fk_pathology_user FOREIGN KEY (confirmed_by)   REFERENCES users(id)
);
