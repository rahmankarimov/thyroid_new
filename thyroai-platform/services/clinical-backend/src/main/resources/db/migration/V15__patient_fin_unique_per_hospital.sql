ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_fin_key;

ALTER TABLE patients ADD CONSTRAINT uq_patient_fin_hospital UNIQUE (fin, hospital_id);
