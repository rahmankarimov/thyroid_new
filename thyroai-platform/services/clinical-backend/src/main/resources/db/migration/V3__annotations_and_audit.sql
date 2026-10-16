-- ============================================================
-- V3 — Annotations and Audit Logs
--
-- Annotations are freehand drawings doctors place on ultrasound
-- images to mark regions of interest. They are soft-deleted
-- (deleted_at timestamp) so the history is preserved.
--
-- Audit logs record significant user actions for compliance and
-- traceability. The action column is an enum value defined in
-- AuditAction.java (LOGIN, LOGOUT, ANNOTATION_ADDED, etc.).
-- ============================================================


-- ------------------------------------------------------------
-- Annotations
-- path stores a JSON array of {x, y} coordinate objects
-- serialised as TEXT. image_series_id and patient_id are stored
-- as plain UUIDs (no FK constraint) so annotations survive even
-- if the referenced series is later replaced or re-uploaded.
-- ------------------------------------------------------------
CREATE TABLE annotations (
    id              UUID          NOT NULL PRIMARY KEY,
    image_series_id UUID          NOT NULL,          -- No FK — intentionally loose reference
    patient_id      UUID          NOT NULL,          -- Denormalised for quick patient-scoped queries
    doctor_id       UUID,                            -- The doctor who drew the annotation (nullable for system)
    path            TEXT          NOT NULL,          -- JSON: [{x:120,y:240},{x:135,y:255},...]
    comment         VARCHAR(2000) NOT NULL,
    color           VARCHAR(50),                     -- Hex colour chosen by the doctor e.g. "#ef4444"
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP,                       -- NULL = active; non-NULL = soft-deleted

    CONSTRAINT fk_annotation_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
);


-- ------------------------------------------------------------
-- Audit Logs
-- action values match the AuditAction enum exactly.
-- patient_id is stored without a FK so logs survive patient
-- deletion and remain useful for compliance history.
-- ip_address is captured from the request when available.
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id         UUID         NOT NULL PRIMARY KEY,
    doctor_id  UUID,                                -- The user who triggered the action (nullable for system events)
    patient_id UUID,                               -- Optional context — no FK (logs must outlive patients)
    action     VARCHAR(100) NOT NULL,              -- Matches AuditAction enum: LOGIN | LOGOUT | ANNOTATION_ADDED | ...
    details    TEXT,
    ip_address VARCHAR(100),
    timestamp  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
);
