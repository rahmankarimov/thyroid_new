CREATE TABLE tirads_results (
    id UUID PRIMARY KEY,
    examination_id UUID NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    total_points INT NOT NULL,
    level VARCHAR(20) NOT NULL,
    composition VARCHAR(50),
    echogenicity VARCHAR(50),
    shape VARCHAR(50),
    margin VARCHAR(50),
    echogenic_foci TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_tirads_results_examination_id ON tirads_results(examination_id);
