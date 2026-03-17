/**
 * Core entity types for the Word Cloud Analytics Platform.
 * These types map to the database schema and are used throughout the application.
 */

export type TenantStatus = 'active' | 'suspended' | 'pending';
export type TenantPlan = 'free' | 'pro' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: TenantPlan;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type UserRole = 'user' | 'admin' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type WordCloudStatus = 'draft' | 'published' | 'archived';

export interface WordCloudConfig {
  words: Array<{ text: string; weight: number; color?: string }>;
  width?: number;
  height?: number;
  backgroundColor?: string;
  fontFamily?: string;
  rotationRange?: [number, number];
  colors?: string[];
}

export interface WordCloud {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  config: WordCloudConfig;
  status: WordCloudStatus;
  embedId?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface WordCloudConfigVersion {
  id: string;
  wordCloudId: string;
  versionNumber: number;
  snapshot: WordCloudConfig;
  createdById: string;
  createdAt: Date;
}

export type ExportType = 'png' | 'svg' | 'pdf';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface WordCloudExport {
  id: string;
  wordCloudId: string;
  exportType: ExportType;
  status: ExportStatus;
  s3Key?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type JobType = 'render_word_cloud' | 'export_word_cloud' | 'aggregate_analytics';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSetting {
  id: string;
  tenantId: string;
  key: string;
  value: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  changedById: string;
  changedAt: Date;
  ipAddress?: string;
  tenantId: string;
  createdAt: Date;
}

// Analytics types (stored in ClickHouse)
export interface ClickEvent {
  id: string;
  wordCloudId: string;
  sessionId: string;
  word: string;
  weight: number;
  x: number;
  y: number;
  timestamp: Date;
  referrer?: string;
  userAgent?: string;
  country?: string;
  deviceType?: string;
}

export interface AnalyticsAggregation {
  wordCloudId: string;
  word: string;
  clickCount: number;
  uniqueSessions: number;
  avgDwellTime?: number;
  date: Date;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  requestId: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any[];
  };
  requestId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  requestId: string;
}