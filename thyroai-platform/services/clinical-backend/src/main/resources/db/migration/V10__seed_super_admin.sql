INSERT INTO users (id, email, password_hash, first_name, last_name, role, hospital_id, active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'superadmin@thyroai.com',
    '$2b$10$jpvfvDWduhChmIovnDZoe.cxEIrLzQtUu5cKK4wpEledl5gbLRDhe',
    'Super',
    'Admin',
    'SUPER_ADMIN',
    NULL,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;
