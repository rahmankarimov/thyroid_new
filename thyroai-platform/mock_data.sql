DO $$
DECLARE
    v_hospital_id UUID := gen_random_uuid();
    v_doctor_id UUID := gen_random_uuid();
    v_patient1_id UUID := gen_random_uuid();
    v_patient2_id UUID := gen_random_uuid();
    v_patient3_id UUID := gen_random_uuid();
    v_exam1_id UUID := gen_random_uuid();
    v_exam2_id UUID := gen_random_uuid();
    v_exam3_id UUID := gen_random_uuid();
BEGIN
    -- 1. Create a Hospital
    INSERT INTO hospitals (id, name, code, grant_ai_suggestion, grant_pathology_input, grant_annotation_tool, grant_image_gallery)
    VALUES (v_hospital_id, 'Central Medical City', 'CMC', TRUE, TRUE, TRUE, TRUE);

    -- 2. Create a Doctor User
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, hospital_id, active, created_at, updated_at)
    VALUES (v_doctor_id, 'doctor@cmc.com', '$2b$10$jpvfvDWduhChmIovnDZoe.cxEIrLzQtUu5cKK4wpEledl5gbLRDhe', 'Alice', 'Smith', 'DOCTOR', v_hospital_id, TRUE, NOW(), NOW());

    -- 3. Create User Permissions for the Doctor
    INSERT INTO user_permissions (id, user_id, can_annotate, can_submit_diagnosis, can_see_ai, can_see_gallery, active, must_change_password)
    VALUES (gen_random_uuid(), v_doctor_id, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE);

    -- 4. Create Patients
    INSERT INTO patients (id, first_name, last_name, fin, date_of_birth, gender, referred_by, hospital_id) VALUES
    (v_patient1_id, 'John', 'Doe', 'A123456', '1980-05-15', 'MALE', 'Dr. Adams', v_hospital_id),
    (v_patient2_id, 'Jane', 'Roe', 'B987654', '1975-10-20', 'FEMALE', 'Dr. Baker', v_hospital_id),
    (v_patient3_id, 'Sam', 'Sung', 'C555555', '1990-12-05', 'MALE', 'Dr. Adams', v_hospital_id);

    -- 5. Assign Patients to Doctor
    INSERT INTO patient_assignments (patient_id, doctor_id, assigned_at) VALUES
    (v_patient1_id, v_doctor_id, NOW()),
    (v_patient2_id, v_doctor_id, NOW()),
    (v_patient3_id, v_doctor_id, NOW());

    -- 6. Create Examinations
    INSERT INTO examinations (id, patient_id, examination_date, status) VALUES
    (v_exam1_id, v_patient1_id, '2023-10-01', 'COMPLETED'),
    (v_exam2_id, v_patient2_id, '2023-10-15', 'COMPLETED'),
    (v_exam3_id, v_patient3_id, '2023-11-02', 'PENDING_REVIEW');

    -- 7. Create Image Series (Mock URLs)
    INSERT INTO image_series (id, examination_id, label, thumbnail_url, full_url) VALUES
    (gen_random_uuid(), v_exam1_id, 'Transverse View', 'http://localhost:9000/medical-imaging/mock/thumb1.jpg', 'http://localhost:9000/medical-imaging/mock/full1.dcm'),
    (gen_random_uuid(), v_exam1_id, 'Longitudinal View', 'http://localhost:9000/medical-imaging/mock/thumb2.jpg', 'http://localhost:9000/medical-imaging/mock/full2.dcm'),
    (gen_random_uuid(), v_exam2_id, 'Transverse View', 'http://localhost:9000/medical-imaging/mock/thumb3.jpg', 'http://localhost:9000/medical-imaging/mock/full3.dcm'),
    (gen_random_uuid(), v_exam3_id, 'Doppler View', 'http://localhost:9000/medical-imaging/mock/thumb4.jpg', 'http://localhost:9000/medical-imaging/mock/full4.dcm');

    -- 8. Create AI Scores
    INSERT INTO ai_scores (id, examination_id, malignancy_probability, tirads_score, justification) VALUES
    (gen_random_uuid(), v_exam1_id, 0.85, 'TR5', 'High probability of malignancy due to irregular margins and microcalcifications.'),
    (gen_random_uuid(), v_exam2_id, 0.12, 'TR2', 'Benign cystic appearance, very low malignancy risk.'),
    (gen_random_uuid(), v_exam3_id, 0.45, 'TR4', 'Suspicious solid nodule, recommend FNA.');

    -- 9. Create Pathology Results (for completed exams)
    INSERT INTO pathology_results (id, examination_id, diagnosis, notes, confirmed_by, confirmed_at, approved_for_retraining) VALUES
    (gen_random_uuid(), v_exam1_id, 'Papillary Thyroid Carcinoma', 'Confirmed via FNA biopsy.', v_doctor_id, NOW(), TRUE),
    (gen_random_uuid(), v_exam2_id, 'Benign Follicular Nodule', 'No malignant cells found.', v_doctor_id, NOW(), FALSE);

END $$;
