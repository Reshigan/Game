-- =============================================================================
-- Word Cloud Analytics Platform - Initial Schema Migration (UP)
-- =============================================================================
-- This migration creates the initial database schema with:
-- - Multi-tenant architecture with Row-Level Security
-- - Audit logging for sensitive operations
-- - Proper indexes for performance
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE tenant_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE word_cloud_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE export_type AS ENUM ('png', 'svg', 'pdf', 'json');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE job_type AS ENUM ('render_word_cloud', 'export_word_cloud', 'cleanup_exports', 'aggregate_analytics');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Tenants table (multi-tenant root)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    plan tenant_plan NOT NULL DEFAULT 'free',
    status tenant_status NOT NULL DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'viewer',
    status user_status NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_password_hash CHECK (LENGTH(password_hash) >= 60)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Word clouds table
CREATE TABLE word_clouds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    status word_cloud_status NOT NULL DEFAULT 'draft',
    embed_id VARCHAR(255) UNIQUE,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_word_clouds_tenant_id ON word_clouds(tenant_id);
CREATE INDEX idx_word_clouds_user_id ON word_clouds(user_id);
CREATE INDEX idx_word_clouds_status ON word_clouds(status);
CREATE INDEX idx_word_clouds_embed_id ON word_clouds(embed_id);
CREATE INDEX idx_word_clouds_created_at ON word_clouds(created_at);

-- Word cloud config versions (version history)
CREATE TABLE word_cloud_config_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_cloud_id UUID NOT NULL REFERENCES word_clouds(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_config_versions_word_cloud_version UNIQUE (word_cloud_id, version_number)
);

CREATE INDEX idx_config_versions_word_cloud_id ON word_cloud_config_versions(word_cloud_id);

-- Word cloud exports table
CREATE TABLE word_cloud_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    word_cloud_id UUID NOT NULL REFERENCES word_clouds(id) ON DELETE CASCADE,
    export_type export_type NOT NULL,
    status export_status NOT NULL DEFAULT 'pending',
    s3_key VARCHAR(512),
    file_size INTEGER,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_exports_tenant_id ON word_cloud_exports(tenant_id);
CREATE INDEX idx_exports_word_cloud_id ON word_cloud_exports(word_cloud_id);
CREATE INDEX idx_exports_status ON word_cloud_exports(status);

-- Jobs table (background job queue)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type job_type NOT NULL,
    payload JSONB NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE INDEX idx_jobs_type_status ON jobs(type, status);

-- Tenant settings table
CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_settings_tenant_key UNIQUE (tenant_id, key)
);

CREATE INDEX idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);

-- =============================================================================
-- AUDIT LOG TABLE
-- =============================================================================

-- Audit log for sensitive operations (GDPR/SOX compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, READ
    field_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by_id);

-- =============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_clouds ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_cloud_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_cloud_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current tenant ID from session
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', TRUE)::UUID, NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Tenants: Users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
    USING (id = current_tenant_id());

-- Users: Users can only see users in their own tenant
CREATE POLICY user_tenant_isolation ON users
    USING (tenant_id = current_tenant_id());

-- Word clouds: Users can only see word clouds in their own tenant
CREATE POLICY word_cloud_tenant_isolation ON word_clouds
    USING (tenant_id = current_tenant_id());

-- Word cloud config versions: Users can only see versions in their own tenant
CREATE POLICY config_version_tenant_isolation ON word_cloud_config_versions
    USING (word_cloud_id IN (SELECT id FROM word_clouds));

-- Word cloud exports: Users can only see exports in their own tenant
CREATE POLICY export_tenant_isolation ON word_cloud_exports
    USING (tenant_id = current_tenant_id());

-- Jobs: Users can only see jobs in their own tenant
CREATE POLICY job_tenant_isolation ON jobs
    USING (tenant_id = current_tenant_id() OR tenant_id IS NULL);

-- Tenant settings: Users can only see settings in their own tenant
CREATE POLICY tenant_setting_isolation ON tenant_settings
    USING (tenant_id = current_tenant_id());

-- Audit logs: Users can only see audit logs in their own tenant
CREATE POLICY audit_log_tenant_isolation ON audit_logs
    USING (tenant_id = current_tenant_id());

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT AND VERSION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_timestamp_and_version() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_timestamp BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

CREATE TRIGGER update_word_clouds_timestamp BEFORE UPDATE ON word_clouds
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

CREATE TRIGGER update_exports_timestamp BEFORE UPDATE ON word_cloud_exports
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

CREATE TRIGGER update_jobs_timestamp BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

CREATE TRIGGER update_tenant_settings_timestamp BEFORE UPDATE ON tenant_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

-- =============================================================================
-- AUDIT LOG TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_log_trigger() RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;

    INSERT INTO audit_logs (
        tenant_id,
        entity_type,
        entity_id,
        action,
        old_value,
        new_value,
        changed_by_id,
        ip_address
    ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        old_data,
        new_data,
        NULLIF(current_setting('app.current_user_id', TRUE)::UUID, NULL),
        NULLIF(current_setting('app.client_ip', TRUE)::INET, NULL)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_word_clouds AFTER INSERT OR UPDATE OR DELETE ON word_clouds
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_exports AFTER INSERT OR UPDATE OR DELETE ON word_cloud_exports
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Create application role
CREATE ROLE wordcloud_app WITH LOGIN PASSWORD 'change_me_in_production';

-- Grant permissions
GRANT USAGE ON SCHEMA public TO wordcloud_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wordcloud_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wordcloud_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO wordcloud_app;

-- Allow app role to set tenant context
GRANT SET ON PARAMETER app.current_tenant_id TO wordcloud_app;
GRANT SET ON PARAMETER app.current_user_id TO wordcloud_app;
GRANT SET ON PARAMETER app.client_ip TO wordcloud_app;