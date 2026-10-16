-- ============================================================
-- V7 — Hospital Active Flag
--
-- Allows the super admin to disable an entire hospital.
-- When active = FALSE, every login attempt and API request
-- from any user belonging to that hospital is rejected with
-- a 403, regardless of the user's own active status.
-- ============================================================

ALTER TABLE hospitals ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
