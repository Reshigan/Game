import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps): JSX.Element {
  const baseStyles = 'animate-pulse bg-slate-200 dark:bg-slate-700';
  
  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  
  const style: React.CSSProperties = {
    width: width,
    height: height,
  };
  
  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn(baseStyles, variantStyles[variant], className)}
            style={style}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }
  
  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function WordCloudSkeleton(): JSX.Element {
  return (
    <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl p-6" aria-hidden="true">
      <div className="flex flex-wrap gap-4 justify-center items-center h-full">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
            style={{
              width: `${Math.random() * 60 + 40}px`,
              height: `${Math.random() * 20 + 12}px`,
              opacity: Math.random() * 0.5 + 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton(): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700" aria-hidden="true">
      <Skeleton variant="rectangular" height={120} className="mb-4" />
      <Skeleton variant="text" width="70%" className="mb-2" />
      <Skeleton variant="text" width="50%" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }): JSX.Element {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="flex gap-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 mb-3">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton(): JSX.Element {
  return (
    <div className="w-full h-64 bg-slate-100 dark:bg-slate-800 rounded-xl p-4" aria-hidden="true">
      <div className="flex items-end justify-between h-full gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-200 dark:bg-slate-700 rounded-t animate-pulse flex-1"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}