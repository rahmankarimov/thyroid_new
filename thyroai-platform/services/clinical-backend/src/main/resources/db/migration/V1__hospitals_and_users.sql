-- ============================================================
-- V1 — Hospitals, Roles, Users, and User Permissions
--
-- This is the foundation of the multi-tenant architecture.
-- Every user belongs to a hospital (except SUPER_ADMIN).
-- Roles are custom labels created per hospital (Doctor,
-- Senior Doctor, etc.) and are separate from the system-level
-- UserRole enum (DOCTOR, ADMIN, SUPER_ADMIN) stored in users.role.
-- ============================================================


-- ------------------------------------------------------------
-- Hospitals
-- Each hospital is an isolated tenant. Feature grants here act
-- as the ceiling for what the hospital admin can enable — the
-- admin can restrict further via widget_settings but cannot
-- enable a feature the super admin has not granted.
-- ------------------------------------------------------------
CREATE TABLE hospitals (
    id                    UUID         NOT NULL PRIMARY KEY,
    name                  VARCHAR(255) NOT NULL,
    code                  VARCHAR(50)  NOT NULL UNIQUE,        -- Short uppercase identifier e.g. "CITY-MED"
    grant_ai_suggestion   BOOLEAN      NOT NULL DEFAULT TRUE,  -- Super admin can revoke any of these
    grant_pathology_input BOOLEAN      NOT NULL DEFAULT TRUE,
    grant_annotation_tool BOOLEAN      NOT NULL DEFAULT TRUE,
    grant_image_gallery   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- Custom Roles
-- Hospital-defined labels (e.g. "Senior Doctor", "Radiologist").
-- These are purely cosmetic — displayed in the personnel table.
-- System-level authorization is driven by users.role (the enum).
-- ------------------------------------------------------------
CREATE TABLE roles (
    id   UUID         NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);


-- ------------------------------------------------------------
-- Users
-- Covers all user types: DOCTOR, ASSISTANT, ADMIN, SUPER_ADMIN.
-- hospital_id is NULL for SUPER_ADMIN (they are global).
-- custom_role_id is optional — only set for non-admin users.
-- ------------------------------------------------------------
CREATE TABLE users (
    id               UUID        NOT NULL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    first_name       VARCHAR(255),
    last_name        VARCHAR(255),
    role             VARCHAR(50)  NOT NULL,                     -- Matches UserRole enum: DOCTOR | ASSISTANT | ADMIN | SUPER_ADMIN
    custom_role_id   UUID,                                      -- Optional display label (FK to roles)
    hospital_id      UUID,                                      -- NULL for SUPER_ADMIN
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,

    CONSTRAINT fk_users_custom_role FOREIGN KEY (custom_role_id) REFERENCES roles(id),
    CONSTRAINT fk_users_hospital    FOREIGN KEY (hospital_id)    REFERENCES hospitals(id)
);


-- ------------------------------------------------------------
-- User Permissions
-- One row per non-super-admin user. Controls what the doctor
-- can do in the doctor panel. Also holds the mustChangePassword
-- flag which forces a password change on next login.
-- The active flag is checked on every JWT request (not just login)
-- so revoking access takes effect immediately.
-- ------------------------------------------------------------
CREATE TABLE user_permissions (
    id                  UUID    NOT NULL PRIMARY KEY,
    user_id             UUID    NOT NULL UNIQUE,               -- One permission record per user
    can_annotate        BOOLEAN NOT NULL DEFAULT TRUE,
    can_submit_diagnosis BOOLEAN NOT NULL DEFAULT TRUE,
    can_see_ai          BOOLEAN NOT NULL DEFAULT TRUE,
    can_see_gallery     BOOLEAN NOT NULL DEFAULT TRUE,
    active              BOOLEAN NOT NULL DEFAULT TRUE,         -- FALSE = blocked (JWT rejected mid-session)
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,       -- TRUE = forced to change on next login
    updated_at          TIMESTAMP,

    CONSTRAINT fk_permissions_user FOREIGN KEY (user_id) REFERENCES users(id)
);
