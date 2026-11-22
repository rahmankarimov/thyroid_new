DO $$
DECLARE
    v_hospital_id UUID;
    v_patient_id UUID;
    v_exam_id UUID;
    v_doc_id UUID;
    v_i INT;
    v_is_common BOOLEAN;
    v_batch INT;
    v_url TEXT;
    v_fin VARCHAR(7);
    v_hash TEXT := '$2b$10$jpvfvDWduhChmIovnDZoe.cxEIrLzQtUu5cKK4wpEledl5gbLRDhe'; -- Demo1234
    v_doc RECORD;
BEGIN
    SELECT id INTO v_hospital_id FROM hospitals LIMIT 1;
    IF v_hospital_id IS NULL THEN
        v_hospital_id := gen_random_uuid();
        INSERT INTO hospitals (id, name, code, grant_ai_suggestion, grant_pathology_input, grant_annotation_tool, grant_image_gallery)
        VALUES (v_hospital_id, 'Central Medical City', 'CMC', TRUE, TRUE, TRUE, TRUE);
    ELSE
        UPDATE hospitals
        SET grant_ai_suggestion = TRUE,
            grant_pathology_input = TRUE,
            grant_annotation_tool = TRUE,
            grant_image_gallery = TRUE
        WHERE id = v_hospital_id;
    END IF;

    -- Ensure superadmin has hospital_id
    UPDATE users SET hospital_id = v_hospital_id WHERE hospital_id IS NULL;

    -- Seed the 5 test scenario clinicians + sample doctor (Password for all: Demo1234)
    FOR v_doc IN
        SELECT * FROM (VALUES
            ('alice@thyroai.com',   'Alice',   'Fast'),
            ('bob@thyroai.com',     'Bob',     'Steady'),
            ('charlie@thyroai.com', 'Charlie', 'Slow'),
            ('david@thyroai.com',   'David',   'Dropout'),
            ('emma@thyroai.com',    'Emma',    'LateJoiner'),
            ('doctor@thyroai.com',  'Sample',  'Doctor')
        ) AS t(email, first_name, last_name)
    LOOP
        SELECT id INTO v_doc_id FROM users WHERE email = v_doc.email;
        IF v_doc_id IS NULL THEN
            v_doc_id := gen_random_uuid();
            INSERT INTO users (id, email, password_hash, first_name, last_name, role, hospital_id, active, created_at, updated_at)
            VALUES (v_doc_id, v_doc.email, v_hash, v_doc.first_name, v_doc.last_name, 'DOCTOR', v_hospital_id, TRUE, NOW(), NOW());
        ELSE
            UPDATE users SET hospital_id = v_hospital_id, active = TRUE, password_hash = v_hash WHERE id = v_doc_id;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM user_permissions WHERE user_id = v_doc_id) THEN
            INSERT INTO user_permissions (id, user_id, can_annotate, can_submit_diagnosis, can_see_ai, can_see_gallery, active, must_change_password)
            VALUES (gen_random_uuid(), v_doc_id, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE);
        ELSE
            UPDATE user_permissions SET active = TRUE, must_change_password = FALSE, can_annotate = TRUE WHERE user_id = v_doc_id;
        END IF;
    END LOOP;

    -- Clean up previous examinations and all related tables
    DELETE FROM tirads_results;
    DELETE FROM image_reservations;
    DELETE FROM clinician_batch_progress;
    DELETE FROM ai_scores;
    DELETE FROM pathology_results;
    DELETE FROM examination_metrics;
    DELETE FROM annotations;
    DELETE FROM image_series;
    DELETE FROM examinations;
    DELETE FROM patient_assignments;
    DELETE FROM patients;

    -- Insert 50 stratified placeholder examinations:
    -- 1..10:  Common Initial Pool (I0), is_common_pool = TRUE,  batch_index = 0
    -- 11..20: Batch B1,                 is_common_pool = FALSE, batch_index = 1
    -- 21..30: Batch B2,                 is_common_pool = FALSE, batch_index = 2
    -- 31..40: Batch B3,                 is_common_pool = FALSE, batch_index = 3
    -- 41..50: Batch B4,                 is_common_pool = FALSE, batch_index = 4
    FOR v_i IN 1..50 LOOP
        v_patient_id := gen_random_uuid();
        v_exam_id := gen_random_uuid();
        
        IF v_i <= 10 THEN
            v_is_common := TRUE;
            v_batch := 0;
        ELSIF v_i <= 20 THEN
            v_is_common := FALSE;
            v_batch := 1;
        ELSIF v_i <= 30 THEN
            v_is_common := FALSE;
            v_batch := 2;
        ELSIF v_i <= 40 THEN
            v_is_common := FALSE;
            v_batch := 3;
        ELSE
            v_is_common := FALSE;
            v_batch := 4;
        END IF;

        v_url := '/medical-imaging/placeholders/image_' || v_i || '.png';
        v_fin := 'P' || LPAD(v_i::text, 6, '0');

        INSERT INTO patients (id, first_name, last_name, fin, date_of_birth, gender, hospital_id)
        VALUES (v_patient_id, 'Image', '#' || v_i, v_fin, '1985-01-01', 'OTHER', v_hospital_id);

        INSERT INTO examinations (id, patient_id, examination_date, status, source, is_common_pool, batch_index)
        VALUES (v_exam_id, v_patient_id, CURRENT_DATE, 'PENDING_REVIEW', 'MANUAL', v_is_common, v_batch);

        INSERT INTO image_series (id, examination_id, label, thumbnail_url, full_url)
        VALUES (gen_random_uuid(), v_exam_id, 'Placeholder #' || v_i, v_url, v_url);
    END LOOP;
END $$;
