// src/types/entities.ts
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
  tenantId: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EventType = 'view' | 'click' | 'share' | 'export' | 'embed_load';
export type EventSource = 'web' | 'api' | 'embed';

export interface AnalyticsEvent {
  id: string;
  tenantId: string;
  wordCloudId?: string;
  eventType: EventType;
  source: EventSource;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface TenantSetting {
  id: string;
  tenantId: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

export interface Webhook {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

// Form Types
export interface CreateWordCloudInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  config: WordCloudConfig;
}

export interface UpdateWordCloudInput {
  name?: string;
  description?: string;
  config?: WordCloudConfig;
  status?: WordCloudStatus;
}

export interface RegisterUserInput {
  email: string;
  password: string;
  name?: string;
  tenantId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

// Analytics Types
export interface WordCloudAnalytics {
  wordCloudId: string;
  totalViews: number;
  totalClicks: number;
  totalShares: number;
  totalExports: number;
  viewsByDay: Array<{ date: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
}

export interface DashboardStats {
  totalWordClouds: number;
  totalViews: number;
  totalExports: number;
  activeEmbeds: number;
  viewsTrend: number;
  exportsTrend: number;
}

// Embed Types
export interface EmbedConfig {
  wordCloudId: string;
  width: number;
  height: number;
  showControls: boolean;
  theme: 'light' | 'dark' | 'auto';
  backgroundColor?: string;
}

export interface EmbedScript {
  script: string;
  iframeUrl: string;
  embedCode: string;
}