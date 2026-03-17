/**
 * Word cloud specific types for frontend and API.
 */

import type { WordCloudConfig } from './entities';

export interface PlacedWord {
  text: string;
  weight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  rotation: number;
  color: string;
}

export interface WordCloudRenderOptions {
  width: number;
  height: number;
  fontFamily?: string;
  fontWeight?: string | number;
  rotationRange?: [number, number];
  rotationSteps?: number;
  colors?: string[];
  backgroundColor?: string;
  padding?: number;
  enableTooltip?: boolean;
  enableClick?: boolean;
  onWordClick?: (word: WordItem) => void;
  onWordHover?: (word: WordItem | null) => void;
}

export interface WordItem {
  text: string;
  weight: number;
  color?: string;
}

export interface WordCloudCreateInput {
  name: string;
  description?: string;
  config: WordCloudConfig;
}

export interface WordCloudUpdateInput {
  name?: string;
  description?: string;
  config?: WordCloudConfig;
  status?: 'draft' | 'published' | 'archived';
}

export interface WordCloudFilter {
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface AnalyticsFilter {
  startDate: Date;
  endDate: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  words?: string[];
}

export interface AnalyticsMetrics {
  totalClicks: number;
  uniqueSessions: number;
  topWords: Array<{
    word: string;
    clicks: number;
    percentage: number;
  }>;
  clicksOverTime: Array<{
    date: string;
    clicks: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf';
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
}

export interface EmbedConfig {
  wordCloudId: string;
  width?: number;
  height?: number;
  showControls?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export interface EmbedToken {
  token: string;
  wordCloudId: string;
  expiresAt: Date;
  domain?: string;
}