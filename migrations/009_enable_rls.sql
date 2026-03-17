-- Up: Enable Row-Level Security for Multi-Tenant Isolation
-- This migration enables RLS on all tenant-scoped tables

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Enable RLS on tenant_settings table
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;

-- Enable RLS on word_clouds table
ALTER TABLE word_clouds ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_clouds FORCE ROW LEVEL SECURITY;

-- Enable RLS on word_cloud_words table
ALTER TABLE word_cloud_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_cloud_words FORCE ROW LEVEL SECURITY;

-- Enable RLS on analytics_events table
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;

-- Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;

-- Enable RLS on word_cloud_versions table
ALTER TABLE word_cloud_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_cloud_versions FORCE ROW LEVEL SECURITY;

-- Create policies for tenants table
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  USING (id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Service role can manage all tenants"
  ON tenants FOR ALL
  USING (current_setting('app.current_user_role', true) = 'service_role');

-- Create policies for users table
CREATE POLICY "Users can view users in own tenant"
  ON users FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (
    id = current_setting('app.current_user_id', true)::uuid
    AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  USING (current_setting('app.current_user_role', true) = 'service_role');

-- Create policies for tenant_settings table
CREATE POLICY "Users can view settings for own tenant"
  ON tenant_settings FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Admins can manage settings for own tenant"
  ON tenant_settings FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND current_setting('app.current_user_role', true) IN ('owner', 'admin')
  );

-- Create policies for word_clouds table
CREATE POLICY "Users can view word clouds in own tenant"
  ON word_clouds FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can create word clouds in own tenant"
  ON word_clouds FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can update own word clouds or admins can update any"
  ON word_clouds FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (
      creator_user_id = current_setting('app.current_user_id', true)::uuid
      OR current_setting('app.current_user_role', true) IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can delete own word clouds or admins can delete any"
  ON word_clouds FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (
      creator_user_id = current_setting('app.current_user_id', true)::uuid
      OR current_setting('app.current_user_role', true) IN ('owner', 'admin')
    )
  );

-- Create policies for word_cloud_words table
CREATE POLICY "Users can view words for word clouds in own tenant"
  ON word_cloud_words FOR SELECT
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds 
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY "Users can insert words for word clouds in own tenant"
  ON word_cloud_words FOR INSERT
  WITH CHECK (word_cloud_id IN (
    SELECT id FROM word_clouds 
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY "Users can update words for word clouds in own tenant"
  ON word_cloud_words FOR UPDATE
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds 
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY "Users can delete words for word clouds in own tenant"
  ON word_cloud_words FOR DELETE
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds 
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- Create policies for analytics_events table
CREATE POLICY "Users can view analytics for own tenant"
  ON analytics_events FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Service role can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can manage all analytics"
  ON analytics_events FOR ALL
  USING (current_setting('app.current_user_role', true) = 'service_role');

-- Create policies for jobs table
CREATE POLICY "Users can view jobs in own tenant"
  ON jobs FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Service role can manage all jobs"
  ON jobs FOR ALL
  USING (current_setting('app.current_user_role', true) = 'service_role');

-- Create policies for word_cloud_versions table
CREATE POLICY "Users can view versions for word clouds in own tenant"
  ON word_cloud_versions FOR SELECT
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds 
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY "System can create versions"
  ON word_cloud_versions FOR INSERT
  WITH CHECK (true);

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_word_clouds_tenant_creator ON word_clouds(tenant_id, creator_user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_timestamp ON analytics_events(tenant_id, timestamp DESC);

-- Create function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(
  p_tenant_id uuid, 
  p_user_id uuid, 
  p_user_role text
) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
  PERFORM set_config('app.current_user_role', p_user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context() RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', false);
  PERFORM set_config('app.current_user_id', '', false);
  PERFORM set_config('app.current_user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Down: Disable Row-Level Security
-- WARNING: This will remove all RLS policies
/*
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE word_clouds DISABLE ROW LEVEL SECURITY;
ALTER TABLE word_cloud_words DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE word_cloud_versions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
DROP POLICY IF EXISTS "Service role can manage all tenants" ON tenants;
-- ... (drop all policies)
DROP FUNCTION IF EXISTS set_tenant_context(uuid, uuid, text);
DROP FUNCTION IF EXISTS clear_tenant_context();
*/