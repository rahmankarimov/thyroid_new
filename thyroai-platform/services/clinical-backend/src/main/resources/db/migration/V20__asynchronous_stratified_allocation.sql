-- V20: Multi-Clinician Allocation Schema (Batches, Pool type, Reservations, Clinician Batch Progress)

-- 1. Add pool and batch tracking to examinations
ALTER TABLE examinations
    ADD COLUMN IF NOT EXISTS is_common_pool BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS batch_index INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_exam_pool_batch ON examinations(is_common_pool, batch_index, status);

-- 2. Clinician current batch tracking
CREATE TABLE IF NOT EXISTS clinician_batch_progress (
    clinician_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_batch INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Expiring Reservations
CREATE TABLE IF NOT EXISTS image_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examination_id UUID NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reserved_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'EXPIRED', 'RELEASED'
    CONSTRAINT uq_active_reservation_exam_clinician UNIQUE (examination_id, clinician_id, status)
);

CREATE INDEX IF NOT EXISTS idx_reservations_exam_active ON image_reservations(examination_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_reservations_clinician_active ON image_reservations(clinician_id, status, expires_at);
