import * as React from 'react';
import { cn } from '@/lib/utils';

interface RiskRingProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
}

export function RiskRing({
  score,
  size = 48,
  strokeWidth = 4,
  showText = true,
  className,
  ...props
}: RiskRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = 'var(--color-risk-low)'; // default to green (high security)
  if (score < 40) strokeColor = 'var(--color-risk-critical)'; // red (terrible security)
  else if (score < 70) strokeColor = 'var(--color-risk-high)'; // orange
  else if (score < 90) strokeColor = 'var(--color-risk-medium)'; // yellow

  return (
    <div 
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-surface-hover)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {showText && (
        <span className="absolute text-xs font-semibold" style={{ color: strokeColor }}>
          {score}
        </span>
      )}
    </div>
  );
}
