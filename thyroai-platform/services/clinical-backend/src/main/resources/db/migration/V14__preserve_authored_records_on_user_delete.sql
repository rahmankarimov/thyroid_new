
-- Annotations
ALTER TABLE annotations DROP CONSTRAINT fk_annotation_doctor;
ALTER TABLE annotations ADD CONSTRAINT fk_annotation_doctor
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL;

-- Audit logs
ALTER TABLE audit_logs DROP CONSTRAINT fk_audit_doctor;
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_doctor
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL;

-- Pathology results (confirmed diagnoses)
ALTER TABLE pathology_results DROP CONSTRAINT fk_pathology_user;
ALTER TABLE pathology_results ADD CONSTRAINT fk_pathology_user
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Examination metrics (manual measurements)
ALTER TABLE examination_metrics DROP CONSTRAINT fk_metric_doctor;
ALTER TABLE examination_metrics ADD CONSTRAINT fk_metric_doctor
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Widget settings (last-edited-by tracking)
ALTER TABLE widget_settings DROP CONSTRAINT fk_widget_user;
ALTER TABLE widget_settings ADD CONSTRAINT fk_widget_user
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Retraining batches (approved-by tracking)
ALTER TABLE retraining_batches DROP CONSTRAINT fk_batch_user;
ALTER TABLE retraining_batches ADD CONSTRAINT fk_batch_user
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;


ALTER TABLE patients DROP CONSTRAINT fk_patient_hospital;
ALTER TABLE patients ADD CONSTRAINT fk_patient_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL;
