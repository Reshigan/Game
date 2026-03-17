import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  className?: string;
}

export function Alert({ children, variant = 'info', className = '' }: AlertProps) {
  const variants = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}

interface AlertTitleProps {
  children: ReactNode;
}

export function AlertTitle({ children }: AlertTitleProps) {
  return <h5 className="mb-1 font-medium leading-none tracking-tight">{children}</h5>;
}

interface AlertDescriptionProps {
  children: ReactNode;
}

export function AlertDescription({ children }: AlertDescriptionProps) {
  return <div className="text-sm opacity-90">{children}</div>;
}