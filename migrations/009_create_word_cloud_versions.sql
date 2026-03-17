# migrations/009_create_word_cloud_versions.sql
-- Up
CREATE TABLE word_cloud_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_cloud_id UUID NOT NULL REFERENCES word_clouds(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (word_cloud_id, version_number)
);

CREATE INDEX idx_word_cloud_versions_word_cloud_id ON word_cloud_versions(word_cloud_id);
CREATE INDEX idx_word_cloud_versions_version_number ON word_cloud_versions(version_number);
CREATE INDEX idx_word_cloud_versions_is_active ON word_cloud_versions(is_active);

-- Down
DROP TABLE IF EXISTS word_cloud_versions CASCADE;