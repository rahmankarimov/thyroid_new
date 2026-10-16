CREATE TABLE examination_metrics (
    id             UUID         NOT NULL PRIMARY KEY,
    examination_id UUID         NOT NULL,
    patient_id     UUID         NOT NULL,   -- denormalized for patient-wide history queries
    metric_key     VARCHAR(255) NOT NULL,
    metric_value   VARCHAR(255) NOT NULL,
    created_by     UUID,                    -- doctor who entered the value
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_metric_exam   FOREIGN KEY (examination_id) REFERENCES examinations(id),
    CONSTRAINT fk_metric_doctor FOREIGN KEY (created_by)     REFERENCES users(id)
);

CREATE INDEX idx_metric_examination ON examination_metrics (examination_id);
CREATE INDEX idx_metric_patient     ON examination_metrics (patient_id);
