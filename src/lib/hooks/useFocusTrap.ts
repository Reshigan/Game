import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
  enabled?: boolean;
  initialFocus?: string;
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions = {}
): React.RefObject<T | null> {
  const { enabled = true, initialFocus, onEscape } = options;
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const elements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    return Array.from(elements).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    );
  }, []);
  
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }
      
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [enabled, onEscape, getFocusableElements]
  );
  
  useEffect(() => {
    if (!enabled) return;
    
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    const focusableElements = getFocusableElements();
    
    if (initialFocus) {
      const initialElement = containerRef.current?.querySelector<HTMLElement>(initialFocus);
      initialElement?.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [enabled, initialFocus, handleKeyDown, getFocusableElements]);
  
  return containerRef;
}