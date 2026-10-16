ALTER TABLE hospitals
    ADD COLUMN grant_view_annotations BOOLEAN NOT NULL DEFAULT TRUE;

-- Hospital-admin visibility toggle (per hospital).
ALTER TABLE widget_settings
    ADD COLUMN show_view_annotations BOOLEAN NOT NULL DEFAULT TRUE;
