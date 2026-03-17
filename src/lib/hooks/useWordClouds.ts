import { useState, useEffect, useCallback, useRef } from 'react';
import type { WordCloud, PaginatedResponse, ApiResponse, ApiError } from '@/types/entities';

interface UseWordCloudsOptions {
  initialData?: WordCloud[];
  pageSize?: number;
  autoFetch?: boolean;
}

interface UseWordCloudsReturn {
  wordClouds: WordCloud[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchWordClouds: () => Promise<void>;
  loadMore: () => Promise<void>;
  createWordCloud: (data: CreateWordCloudInput) => Promise<WordCloud | null>;
  updateWordCloud: (id: string, data: Partial<CreateWordCloudInput>) => Promise<WordCloud | null>;
  deleteWordCloud: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

interface CreateWordCloudInput {
  title: string;
  description?: string;
  sourceText: string;
  settings?: Partial<WordCloud['settings']>;
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

export function useWordClouds(options: UseWordCloudsOptions = {}): UseWordCloudsReturn {
  const { initialData = [], pageSize = 20, autoFetch = true } = options;
  
  const [wordClouds, setWordClouds] = useState<WordCloud[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchWordClouds = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
      });
      
      const response = await fetch(`/api/v1/word-clouds?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData: ApiResponse<never> = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch word clouds');
      }
      
      const data: PaginatedResponse<WordCloud> = await response.json();
      setWordClouds(data.data);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor || null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);
  
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !cursor) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        cursor,
      });
      
      const response = await fetch(`/api/v1/word-clouds?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData: ApiResponse<never> = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load more word clouds');
      }
      
      const data: PaginatedResponse<WordCloud> = await response.json();
      setWordClouds((prev) => [...prev, ...data.data]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor || null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, cursor, pageSize]);
  
  const createWordCloud = useCallback(async (data: CreateWordCloudInput): Promise<WordCloud | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData: ApiResponse<never> = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create word cloud');
      }
      
      const result: ApiResponse<WordCloud> = await response.json();
      
      if (result.data) {
        setWordClouds((prev) => [result.data!, ...prev]);
        return result.data;
      }
      
      return null;
    } catch (err) {
      setError(getApiErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateWordCloud = useCallback(async (id: string, data: Partial<CreateWordCloudInput>): Promise<WordCloud | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/word-clouds/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData: ApiResponse<never> = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update word cloud');
      }
      
      const result: ApiResponse<WordCloud> = await response.json();
      
      if (result.data) {
        setWordClouds((prev) =>
          prev.map((wc) => (wc.id === id ? result.data! : wc))
        );
        return result.data;
      }
      
      return null;
    } catch (err) {
      setError(getApiErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const deleteWordCloud = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/word-clouds/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData: ApiResponse<never> = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete word cloud');
      }
      
      setWordClouds((prev) => prev.filter((wc) => wc.id !== id));
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const refresh = useCallback(async () => {
    setCursor(null);
    await fetchWordClouds();
  }, [fetchWordClouds]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchWordClouds();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, fetchWordClouds]);
  
  return {
    wordClouds,
    isLoading,
    error,
    hasMore,
    fetchWordClouds,
    loadMore,
    createWordCloud,
    updateWordCloud,
    deleteWordCloud,
    refresh,
  };
}