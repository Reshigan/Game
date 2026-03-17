# migrations/004_create_word_clouds.sql
-- Up
CREATE TABLE word_clouds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_word_clouds_tenant_id ON word_clouds(tenant_id);
CREATE INDEX idx_word_clouds_creator_user_id ON word_clouds(creator_user_id);
CREATE INDEX idx_word_clouds_is_active ON word_clouds(is_active);

-- Down
DROP TABLE IF EXISTS word_clouds CASCADE;