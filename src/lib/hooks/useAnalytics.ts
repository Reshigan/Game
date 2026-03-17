import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyticsSummary, AnalyticsEvent, ApiResponse, TimeSeriesPoint } from '@/types/entities';

interface UseAnalyticsOptions {
  wordCloudId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseAnalyticsReturn {
  summary: AnalyticsSummary | null;
  events: AnalyticsEvent[];
  timeSeriesData: TimeSeriesPoint[];
  isLoading: boolean;
  error: string | null;
  fetchAnalytics: () => Promise<void>;
  trackEvent: (eventType: AnalyticsEvent['eventType'], word: string, metadata?: Record<string, unknown>) => Promise<void>;
  refresh: () => Promise<void>;
}

function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error?.message) {
        return parsed.error.message;
      }
    } catch {
      return error.message;
    }
  }
  return 'An unexpected error occurred. Please try again.';
}

export function useAnalytics(options: UseAnalyticsOptions): UseAnalyticsReturn {
  const { wordCloudId, dateRange, autoFetch = true, refreshInterval } = options;
  
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string>('');
  
  useEffect(() => {
    sessionTokenRef.current = crypto.randomUUID();
  }, []);
  
  const fetchAnalytics = useCallback(async () => {
    if (!wordCloudId) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        wordCloudId,
      });
      
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      
      const response = await fetch(`/api/v1/analytics?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData: ApiResponse<never> = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch analytics');
      }
      
      const data: ApiResponse<{
        summary: AnalyticsSummary;
        events: AnalyticsEvent[];
        timeSeriesData: TimeSeriesPoint[];
      }> = await response.json();
      
      if (data.data) {
        setSummary(data.data.summary);
        setEvents(data.data.events);
        setTimeSeriesData(data.data.timeSeriesData);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [wordCloudId, dateRange]);
  
  const trackEvent = useCallback(async (
    eventType: AnalyticsEvent['eventType'],
    word: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> => {
    if (!wordCloudId) return;
    
    try {
      await fetch('/api/v1/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wordCloudId,
          eventType,
          word,
          sessionToken: sessionTokenRef.current,
          metadata,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to track event:', getApiErrorMessage(err));
    }
  }, [wordCloudId]);
  
  const refresh = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchAnalytics();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, fetchAnalytics]);
  
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchAnalytics();
      }, refreshInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, fetchAnalytics]);
  
  return {
    summary,
    events,
    timeSeriesData,
    isLoading,
    error,
    fetchAnalytics,
    trackEvent,
    refresh,
  };
}