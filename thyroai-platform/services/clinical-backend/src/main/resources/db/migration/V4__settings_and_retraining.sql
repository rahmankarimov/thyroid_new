-- ============================================================
-- V4 — Widget Settings and Retraining Batches
--
-- Widget settings are scoped per hospital (one row per hospital).
-- The hospital_id is both the PK and the FK, making this a
-- strict one-to-one relationship with the hospitals table.
-- The admin can only toggle features that the super admin has
-- already granted via hospitals.grant_* columns.
--
-- Retraining batches group approved pathology results together
-- for submission to the AI model training pipeline.
-- ============================================================


-- ------------------------------------------------------------
-- Widget Settings
-- One row per hospital. The hospital admin controls these
-- toggles from the Settings page in the admin panel.
-- updated_by tracks which admin last saved the settings.
-- ------------------------------------------------------------
CREATE TABLE widget_settings (
    hospital_id          UUID    NOT NULL PRIMARY KEY,         -- PK = hospital.id (strict 1-to-1)
    show_ai_suggestion   BOOLEAN NOT NULL DEFAULT TRUE,
    show_pathology_input BOOLEAN NOT NULL DEFAULT TRUE,
    show_annotation_tool BOOLEAN NOT NULL DEFAULT TRUE,
    show_image_gallery   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at           TIMESTAMP,
    updated_by           UUID,                                  -- Last admin to save these settings

    CONSTRAINT fk_widget_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    CONSTRAINT fk_widget_user     FOREIGN KEY (updated_by)  REFERENCES users(id)
);


-- ------------------------------------------------------------
-- Retraining Batches
-- A batch is created when an admin approves a set of pathology
-- results for AI retraining. status lifecycle:
-- PENDING_TRAINING → IN_PROGRESS → COMPLETED | FAILED
-- ------------------------------------------------------------
CREATE TABLE retraining_batches (
    id          UUID        NOT NULL PRIMARY KEY,
    approved_by UUID,                                          -- Admin who approved the batch
    approved_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    case_count  INT         NOT NULL DEFAULT 0,                -- Number of pathology cases included
    status      VARCHAR(50) NOT NULL DEFAULT 'PENDING_TRAINING',

    CONSTRAINT fk_batch_user FOREIGN KEY (approved_by) REFERENCES users(id)
);


-- ------------------------------------------------------------
-- Batch ↔ Pathology Results (many-to-many join table)
-- Links each retraining batch to the specific pathology results
-- it includes. A result can appear in at most one batch.
-- ------------------------------------------------------------
CREATE TABLE batch_pathology_results (
    batch_id            UUID NOT NULL,
    pathology_result_id UUID NOT NULL,

    PRIMARY KEY (batch_id, pathology_result_id),
    CONSTRAINT fk_batch_result_batch   FOREIGN KEY (batch_id)            REFERENCES retraining_batches(id),
    CONSTRAINT fk_batch_result_pathology FOREIGN KEY (pathology_result_id) REFERENCES pathology_results(id)
);
