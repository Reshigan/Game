# migrations/006_create_analytics_events.sql
-- Up
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  word_cloud_id UUID NOT NULL REFERENCES word_clouds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('click','hover','view')),
  word TEXT NOT NULL,
  session_token TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1
);

-- Timescale hypertable
SELECT create_hypertable('analytics_events', 'timestamp', if_not_exists => true);

-- Indexes
CREATE INDEX idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_word_cloud_id ON analytics_events(word_cloud_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_events_session_token ON analytics_events(session_token);
CREATE INDEX idx_analytics_events_word ON analytics_events(word);
CREATE INDEX idx_analytics_events_is_active ON analytics_events(is_active);

-- Down
DROP TABLE IF EXISTS analytics_events CASCADE;