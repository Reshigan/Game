export type UUID = string;

export interface Tenant {
  id: UUID;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export interface User {
  id: UUID;
  tenantId: UUID;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export interface TenantSettings {
  id: UUID;
  tenantId: UUID;
  theme: 'light' | 'dark' | 'system';
  defaultWordCount: number;
  minFontSize: number;
  maxFontSize: number;
  colorPalette: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export interface WordCloud {
  id: UUID;
  tenantId: UUID;
  title: string;
  description: string;
  sourceText: string;
  settings: WordCloudSettings;
  words: WordCloudWord[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export interface WordCloudSettings {
  width: number;
  height: number;
  backgroundColor: string;
  fontFamily: string;
  minFontSize: number;
  maxFontSize: number;
  colorPalette: string[];
  rotation: 'none' | 'random' | 'fixed';
  spiral: 'archimedean' | 'rectangular';
}

export interface WordCloudWord {
  id: UUID;
  wordCloudId: UUID;
  word: string;
  frequency: number;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
  rotation?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export type EventType = 'click' | 'hover' | 'view' | 'export' | 'share';

export interface AnalyticsEvent {
  id: UUID;
  tenantId: UUID;
  wordCloudId: UUID;
  userId?: UUID;
  eventType: EventType;
  word: string;
  sessionToken: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export interface AnalyticsSummary {
  wordCloudId: UUID;
  totalViews: number;
  totalClicks: number;
  totalHovers: number;
  totalExports: number;
  totalShares: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  topWords: WordAnalyticsItem[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface WordAnalyticsItem {
  word: string;
  frequency: number;
  clicks: number;
  hovers: number;
  clickRate: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  views: number;
  clicks: number;
  hovers: number;
}

export interface AuditLog {
  id: UUID;
  entityType: string;
  entityId: UUID;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy?: UUID;
  changedAt: Date;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: UUID;
  tenantId: UUID;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export interface WordCloudVersion {
  id: UUID;
  wordCloudId: UUID;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  createdBy?: UUID;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  version: number;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  requestId: string;
}