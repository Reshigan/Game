# migrations/003_create_tenant_settings.sql
-- Up
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, key)
);

CREATE INDEX idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX idx_tenant_settings_key ON tenant_settings(key);
CREATE INDEX idx_tenant_settings_is_active ON tenant_settings(is_active);

-- Down
DROP TABLE IF EXISTS tenant_settings CASCADE;