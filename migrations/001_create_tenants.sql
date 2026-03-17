# migrations/001_create_tenants.sql
-- Up
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_tenants_name ON tenants(name);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- Down
DROP TABLE IF EXISTS tenants CASCADE;