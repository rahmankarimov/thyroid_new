-- ============================================================
-- V5 — Seed: Default Custom Roles
--
-- Inserts the four standard hospital roles that ship with the
-- system. These are cosmetic labels used in the Personnel table
-- of the admin panel — they do NOT affect system permissions,
-- which are driven by the UserRole enum (DOCTOR, ADMIN, etc.).
--
-- Fixed UUIDs ensure this migration is fully idempotent:
-- re-running it (or running it on any environment) always
-- produces the same rows and the same foreign key references,
-- so DataInitializer and tests can safely hard-code these IDs.
-- ============================================================

INSERT INTO roles (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Doctor'),
    ('00000000-0000-0000-0000-000000000002', 'Senior Doctor'),
    ('00000000-0000-0000-0000-000000000003', 'Radiologist'),
    ('00000000-0000-0000-0000-000000000004', 'Assistant');
