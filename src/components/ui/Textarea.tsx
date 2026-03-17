import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, maxLength, showCount = false, id, value, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    
    const currentLength = typeof value === 'string' ? value.length : 0;
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            value={value}
            maxLength={maxLength}
            className={cn(
              'w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200',
              'px-4 py-3 min-h-[120px] resize-y',
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500 focus:border-indigo-500',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            {...props}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <div>
            {error && (
              <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={hintId} className="text-sm text-slate-500 dark:text-slate-400">
                {hint}
              </p>
            )}
          </div>
          {showCount && maxLength && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };