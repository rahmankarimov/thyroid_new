ALTER TABLE user_permissions
    ADD COLUMN can_view_annotations BOOLEAN NOT NULL DEFAULT TRUE;
