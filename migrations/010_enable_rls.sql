# migrations/010_enable_rls.sql
-- Up
-- Tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tenants ON tenants USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Tenant Settings
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tenant_settings ON tenant_settings USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Word Clouds
ALTER TABLE word_clouds ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_word_clouds ON word_clouds USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Word Cloud Words
ALTER TABLE word_cloud_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_word_cloud_words ON word_cloud_words USING (EXISTS (SELECT 1 FROM word_clouds wc WHERE wc.id = word_cloud_id AND wc.tenant_id = current_setting('app.current_tenant_id')::uuid));

-- Analytics Events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_analytics_events ON analytics_events USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Audit Log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_log ON audit_log USING (entity_id IN (SELECT id FROM tenants WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));

-- Jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_jobs ON jobs USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Word Cloud Versions
ALTER TABLE word_cloud_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_word_cloud_versions ON word_cloud_versions USING (word_cloud_id IN (SELECT id FROM word_clouds WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));

-- Down
-- Policies are dropped automatically when tables are dropped