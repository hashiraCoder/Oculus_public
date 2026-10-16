import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div 
      className={cn("flex flex-col items-center justify-center p-8 text-center animate-fade-in", className)} 
      {...props}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-bg-surface p-4 border border-border-base">
          <Icon className="h-8 w-8 text-text-tertiary" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-text-secondary">
        {description}
      </p>
      
      <div className="flex items-center gap-4">
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
