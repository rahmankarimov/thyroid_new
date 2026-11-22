DO $$
DECLARE
    v_hospital_id UUID;
    v_patient_id UUID;
    v_exam_id UUID;
    v_i INT;
    v_is_common BOOLEAN;
    v_batch INT;
    v_url TEXT;
    v_fin VARCHAR(7);
BEGIN
    SELECT id INTO v_hospital_id FROM hospitals LIMIT 1;
    IF v_hospital_id IS NULL THEN
        v_hospital_id := gen_random_uuid();
        INSERT INTO hospitals (id, name, code, grant_ai_suggestion, grant_pathology_input, grant_annotation_tool, grant_image_gallery)
        VALUES (v_hospital_id, 'Central Medical City', 'CMC', TRUE, TRUE, TRUE, TRUE);
    END IF;

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

    -- Insert 50 placeholder examinations:
    -- 1..10: is_common_pool = TRUE, batch_index = 0
    -- 11..30: is_common_pool = FALSE, batch_index = 1
    -- 31..50: is_common_pool = FALSE, batch_index = 2
    FOR v_i IN 1..50 LOOP
        v_patient_id := gen_random_uuid();
        v_exam_id := gen_random_uuid();
        
        IF v_i <= 10 THEN
            v_is_common := TRUE;
            v_batch := 0;
        ELSIF v_i <= 30 THEN
            v_is_common := FALSE;
            v_batch := 1;
        ELSE
            v_is_common := FALSE;
            v_batch := 2;
        END IF;

        v_url := 'http://localhost:9000/medical-imaging/placeholders/image_' || v_i || '.png';
        v_fin := 'P' || LPAD(v_i::text, 6, '0');

        INSERT INTO patients (id, first_name, last_name, fin, date_of_birth, gender, hospital_id)
        VALUES (v_patient_id, 'Patient', 'No-' || v_i, v_fin, '1985-01-01', 'OTHER', v_hospital_id);

        INSERT INTO examinations (id, patient_id, examination_date, status, source, is_common_pool, batch_index)
        VALUES (v_exam_id, v_patient_id, CURRENT_DATE, 'PENDING_REVIEW', 'MANUAL', v_is_common, v_batch);

        INSERT INTO image_series (id, examination_id, label, thumbnail_url, full_url)
        VALUES (gen_random_uuid(), v_exam_id, 'Placeholder #' || v_i, v_url, v_url);
    END LOOP;
END $$;
