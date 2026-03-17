# migrations/011_enable_timescale_hypertable.sql
-- Up
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('analytics_events', 'timestamp', if_not_exists => true);

-- Down
-- No explicit down needed; hypertable is part of analytics_events table