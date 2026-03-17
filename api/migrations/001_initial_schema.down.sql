-- =============================================================================
-- Word Cloud Analytics Platform - Initial Schema Migration (DOWN)
-- =============================================================================
-- This migration rolls back the initial schema.
-- WARNING: This will delete all data!
-- =============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS audit_users ON users;
DROP TRIGGER IF EXISTS audit_word_clouds ON word_clouds;
DROP TRIGGER IF EXISTS audit_exports ON word_cloud_exports;
DROP TRIGGER IF EXISTS update_tenants_timestamp ON tenants;
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
DROP TRIGGER IF EXISTS update_word_clouds_timestamp ON word_clouds;
DROP TRIGGER IF EXISTS update_exports_timestamp ON word_cloud_exports;
DROP TRIGGER IF EXISTS update_jobs_timestamp ON jobs;
DROP TRIGGER IF EXISTS update_tenant_settings_timestamp ON tenant_settings;

-- Drop functions
DROP FUNCTION IF EXISTS audit_log_trigger();
DROP FUNCTION IF EXISTS update_timestamp_and_version();
DROP FUNCTION IF EXISTS current_tenant_id();

-- Drop policies
DROP POLICY IF EXISTS tenant_isolation ON tenants;
DROP POLICY IF EXISTS user_tenant_isolation ON users;
DROP POLICY IF EXISTS word_cloud_tenant_isolation ON word_clouds;
DROP POLICY IF EXISTS config_version_tenant