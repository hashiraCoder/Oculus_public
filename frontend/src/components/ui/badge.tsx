import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide border transition-colors focus:outline-none select-none',
  {
    variants: {
      variant: {
        default: 'bg-bg-surface-hover text-text-secondary border-border-base',
        primary: 'bg-primary-alpha text-primary-base border-primary-base/20',
        critical: 'bg-risk-critical-alpha text-risk-critical border-risk-critical-border',
        high: 'bg-risk-high-alpha text-risk-high border-risk-high-border',
        medium: 'bg-risk-medium-alpha text-risk-medium border-risk-medium-border',
        low: 'bg-risk-low-alpha text-risk-low border-risk-low-border',
        info: 'bg-risk-info-alpha text-risk-info border-risk-info-border',
        outline: 'text-text-primary border-border-base bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
