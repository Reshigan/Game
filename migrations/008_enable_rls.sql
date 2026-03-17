-- Enable Row Level Security on all tenant-scoped tables
-- This ensures tenant isolation at the database level

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tenant_settings table
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on word_clouds table
ALTER TABLE word_clouds ENABLE ROW LEVEL SECURITY;

-- Enable RLS on word_cloud_words table
ALTER TABLE word_cloud_words ENABLE ROW LEVEL SECURITY;

-- Enable RLS on analytics_events table
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on word_cloud_versions table
ALTER TABLE word_cloud_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for tenants table
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::uuid));

CREATE POLICY "Only owners can update tenant"
  ON tenants FOR UPDATE
  USING (id IN (
    SELECT t.id FROM tenants t
    JOIN users u ON u.tenant_id = t.id
    WHERE u.id = current_setting('app.current_user_id')::uuid
    AND u.role = 'owner'
  ));

-- Create policies for users table
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can insert users in their tenant"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('owner', 'admin')
  );

CREATE POLICY "Users can update own profile or admins can update any in tenant"
  ON users FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      id = current_setting('app.current_user_id')::uuid
      OR current_setting('app.current_user_role') IN ('owner', 'admin')
    )
  );

-- Create policies for word_clouds table
CREATE POLICY "Users can view word clouds in their tenant"
  ON word_clouds FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can create word clouds in their tenant"
  ON word_clouds FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND creator_user_id = current_setting('app.current_user_id')::uuid
  );

CREATE POLICY "Users can update own word clouds or editors/admins can update any"
  ON word_clouds FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      creator_user_id = current_setting('app.current_user_id')::uuid
      OR current_setting('app.current_user_role') IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can delete own word clouds or admins can delete any"
  ON word_clouds FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      creator_user_id = current_setting('app.current_user_id')::uuid
      OR current_setting('app.current_user_role') IN ('owner', 'admin')
    )
  );

-- Create policies for word_cloud_words table
CREATE POLICY "Users can view words for word clouds in their tenant"
  ON word_cloud_words FOR SELECT
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY "Users can insert words for word clouds in their tenant"
  ON word_cloud_words FOR INSERT
  WITH CHECK (word_cloud_id IN (
    SELECT id FROM word_clouds WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY "Users can update words for word clouds in their tenant"
  ON word_cloud_words FOR UPDATE
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY "Users can delete words for word clouds in their tenant"
  ON word_cloud_words FOR DELETE
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Create policies for analytics_events table
CREATE POLICY "Users can view analytics for their tenant"
  ON analytics_events FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Service role can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true); -- Allow public insert for anonymous events

-- Create policies for jobs table
CREATE POLICY "Users can view jobs in their tenant"
  ON jobs FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Service role can manage all jobs"
  ON jobs FOR ALL
  USING (true);

-- Create policies for word_cloud_versions table
CREATE POLICY "Users can view versions for word clouds in their tenant"
  ON word_cloud_versions FOR SELECT
  USING (word_cloud_id IN (
    SELECT id FROM word_clouds WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY "System can create versions"
  ON word_cloud_versions FOR INSERT
  WITH CHECK (true);

-- Create indexes for RLS performance
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_word_clouds_tenant_creator ON word_clouds(tenant_id, creator_user_id);
CREATE INDEX idx_analytics_events_tenant_timestamp ON analytics_events(tenant_id, timestamp DESC);

-- Create function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid, p_user_id uuid, p_user_role text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
  PERFORM set_config('app.current_user_role', p_user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;