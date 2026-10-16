-- ============================================================
-- V6 — Patient Hospital Scoping and Doctor Assignments
--
-- Patients are now scoped to a hospital via hospital_id.
-- The admin who creates a patient sets the hospital at
-- creation time — patients are invisible to other hospitals.
--
-- patient_assignments is a join table that links patients to
-- the specific doctors assigned to manage them. When a doctor
-- logs in they see only their assigned patients; admins see
-- all patients belonging to their hospital.
-- ============================================================


-- ------------------------------------------------------------
-- Scope patients to a hospital
-- hospital_id is intentionally nullable so existing rows are
-- not broken by the migration. The application always sets it.
-- ------------------------------------------------------------
ALTER TABLE patients ADD COLUMN hospital_id UUID;

ALTER TABLE patients
    ADD CONSTRAINT fk_patient_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id);


-- ------------------------------------------------------------
-- Patient-Doctor Assignments
-- Composite PK (patient_id + doctor_id) prevents duplicates.
-- ON DELETE CASCADE on patient_id: removing a patient
-- automatically removes all their assignment rows.
-- assigned_by records which admin created the assignment.
-- ------------------------------------------------------------
CREATE TABLE patient_assignments (
    patient_id  UUID      NOT NULL,
    doctor_id   UUID      NOT NULL,
    assigned_by UUID,                                      -- Admin who created the assignment
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (patient_id, doctor_id),
    CONSTRAINT fk_pa_patient FOREIGN KEY (patient_id)  REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_doctor  FOREIGN KEY (doctor_id)   REFERENCES users(id),
    CONSTRAINT fk_pa_admin   FOREIGN KEY (assigned_by) REFERENCES users(id)
);
