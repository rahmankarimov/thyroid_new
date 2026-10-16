-- Creates the clinical and imaging databases inside the single Postgres instance.
-- Runs only on first volume init (official postgres docker-entrypoint.d hook).

CREATE DATABASE thyroaidb;
CREATE DATABASE medical_imaging;
