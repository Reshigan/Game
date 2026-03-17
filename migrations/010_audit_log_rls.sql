-- Up: Enable RLS on audit_log table and create retention policy

-- Enable RLS on audit_log table
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Create policies for audit_log table
CREATE POLICY "Admins can view audit logs in own tenant"
  ON audit_log FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('owner', 'admin')
    AND (
      entity_type IN ('tenant', 'user', 'tenant_settings', 'word_cloud', 'word_cloud_word', 'analytics_event', 'job', 'word_cloud_version')
      AND (
        -- For tenant-level changes
        (entity_type = 'tenant' AND entity_id = current_setting('app.current_tenant_id', true)::uuid)
        OR
        -- For other entities, check if they belong to the tenant
        (entity_type != 'tenant' AND entity_id IN (
          SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
          UNION
          SELECT id FROM word_clouds WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
          UNION
          SELECT id FROM tenant_settings WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
        ))
      )
    )
  );

CREATE POLICY "Service role can manage all audit logs"
  ON audit_log FOR ALL
  USING (current_setting('app.current_user_role', true) = 'service_role');

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);

-- Create function to automatically insert audit log entries
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_values jsonb;
  new_values jsonb;
  column_name text;
BEGIN
  old_values := '{}'::jsonb;
  new_values := '{}'::jsonb;
  
  -- Build old and new values
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    FOR column_name IN SELECT column_name FROM information_schema.columns WHERE table_name = TG_TABLE_NAME::text
    LOOP
      IF TG_OP = 'DELETE' THEN
        old_values := old_values || jsonb_build_object(column_name, OLD);
      ELSE
        old_values := old_values || jsonb_build_object(column_name, OLD);
        new_values := new_values || jsonb_build_object(column_name, NEW);
      END IF;
    END LOOP;
  ELSIF TG_OP = 'INSERT' THEN
    FOR column_name IN SELECT column_name FROM information_schema.columns WHERE table_name = TG_TABLE_NAME::text
    LOOP
      new_values := new_values || jsonb_build_object(column_name, NEW);
    END LOOP;
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_log (
    entity_type,
    entity_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    changed_at,
    ip_address
  ) VALUES (
    TG_TABLE_NAME::text,
    COALESCE(NEW.id, OLD.id),
    TG_OP::text,
    CASE WHEN old_values = '{}'::jsonb THEN NULL ELSE old_values END,
    CASE WHEN new_values = '{}'::jsonb THEN NULL ELSE new_values END,
    current_setting('app.current_user_id', true)::uuid,
    now(),
    current_setting('app.client_ip', true)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging (example for word_clouds table)
-- Note: In production, create triggers for all tables that need audit logging
CREATE TRIGGER audit_word_clouds
  AFTER INSERT OR UPDATE OR DELETE ON word_clouds
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- Down: Remove RLS and triggers from audit_log
/*
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs in own tenant" ON audit_log;
DROP POLICY IF EXISTS "Service role can manage all audit logs" ON audit_log;
DROP TRIGGER IF EXISTS audit_word_clouds ON word_clouds;
DROP FUNCTION IF EXISTS audit_log_trigger();
*/