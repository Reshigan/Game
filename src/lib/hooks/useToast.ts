import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UseToastReturn {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

let toastIdCounter = 0;

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${++toastIdCounter}`;
    const duration = toast.duration ?? 5000;
    
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  const success = useCallback(
    (title: string, message?: string): string => {
      return addToast({ type: 'success', title, message });
    },
    [addToast]
  );
  
  const error = useCallback(
    (title: string, message?: string): string => {
      return addToast({ type: 'error', title, message, duration: 8000 });
    },
    [addToast]
  );
  
  const warning = useCallback(
    (title: string, message?: string): string => {
      return addToast({ type: 'warning', title, message, duration: 6000 });
    },
    [addToast]
  );
  
  const info = useCallback(
    (title: string, message?: string): string => {
      return addToast({ type: 'info', title, message });
    },
    [addToast]
  );
  
  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  };
}