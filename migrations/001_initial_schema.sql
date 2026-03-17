-- Migration: Initial Schema
-- Version: 1.0.0
-- Description: Creates all tables with Row-Level Security policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE tenant_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'editor', 'viewer');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE word_cloud_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE export_type AS ENUM ('png', 'svg', 'pdf');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE job_type AS ENUM ('render_word_cloud', 'export_word_cloud', 'aggregate_analytics');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) NOT NULL UNIQUE,
    plan tenant_plan NOT NULL DEFAULT 'free',
    status tenant_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Create word_clouds table
CREATE TABLE word_clouds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    status word_cloud_status NOT NULL DEFAULT 'draft',
    embed_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_word_clouds_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_word_clouds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_word_clouds_tenant_id ON word_clouds(tenant_id);
CREATE INDEX idx_word_clouds_user_id ON word_clouds(user_id);
CREATE INDEX idx_word_clouds_status ON word_clouds(status);
CREATE INDEX idx_word_clouds_created_at ON word_clouds(created_at);

-- Create word_cloud_config_versions table
CREATE TABLE word_cloud_config_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_cloud_id UUID NOT NULL REFERENCES word_clouds(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_config_versions_word_cloud FOREIGN KEY (word_cloud_id) REFERENCES word_clouds(id) ON DELETE CASCADE,
    CONSTRAINT fk_config_versions_user FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_config_versions_word_cloud_version UNIQUE (word_cloud_id, version_number)
);

CREATE INDEX idx_config_versions_word_cloud_id ON word_cloud_config_versions(word_cloud_id);

-- Create word_cloud_exports table
CREATE TABLE word_cloud_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_cloud_id UUID NOT NULL REFERENCES word_clouds(id) ON DELETE CASCADE,
    export_type export_type NOT NULL,
    status export_status NOT NULL DEFAULT 'pending',
    s3_key VARCHAR(512),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_exports_word_cloud FOREIGN KEY (word_cloud_id) REFERENCES word_clouds(id) ON DELETE CASCADE
);

CREATE INDEX idx_exports_word_cloud_id ON word_cloud_exports(word_cloud_id);
CREATE INDEX idx_exports_status ON word_cloud_exports(status);

-- Create jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type job_type NOT NULL,
    payload JSONB NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_jobs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_at ON jobs(scheduled_at);

-- Create tenant_settings table
CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL