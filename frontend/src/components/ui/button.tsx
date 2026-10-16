import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary-base text-[#08090C] font-semibold hover:bg-primary-hover hover:shadow-[0_0_14px_rgba(16,185,129,0.25)] active:bg-primary-active border border-transparent',
        destructive: 'bg-risk-critical-alpha text-risk-critical border border-risk-critical-border hover:bg-risk-critical hover:text-white',
        outline: 'border border-border-base bg-transparent text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary hover:border-border-strong',
        secondary: 'bg-bg-surface text-text-primary border border-border-base hover:bg-bg-surface-hover hover:border-border-strong',
        ghost: 'text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary border border-transparent',
        link: 'text-primary-base underline-offset-4 hover:underline border-0 p-0 h-auto',
      },
      size: {
        default: 'h-8 px-3 py-1.5 text-xs gap-1.5',
        sm: 'h-7 rounded px-2.5 py-1 text-[11.5px] gap-1',
        lg: 'h-9.5 rounded-md px-5 py-2 text-sm gap-2',
        icon: 'h-7.5 w-7.5 p-1.5 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild = false, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
