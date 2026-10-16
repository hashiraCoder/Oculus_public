import React from 'react';
import type { RiskGrade } from '@/types/common.types';

interface RiskGradeBadgeProps {
  grade: RiskGrade;
  score?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const gradeStyles: Record<RiskGrade, { box: string; text: string }> = {
  A: { box: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
  B: { box: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
  C: { box: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
  D: { box: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400' },
  F: { box: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400' },
};

export const RiskGradeBadge: React.FC<RiskGradeBadgeProps> = ({ 
  grade, 
  score,
  showLabel = false,
  size = 'md' 
}) => {
  const style = gradeStyles[grade] || gradeStyles.F;
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded',
    md: 'w-9 h-9 text-base rounded-md',
    lg: 'w-11 h-11 text-xl rounded-lg',
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center font-bold border ${style.box} ${style.text} ${sizeClasses}`}>
        {score !== undefined ? score : grade}
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-wider">
            Risk Grade {grade}
          </span>
          {score !== undefined && (
            <span className="text-xs font-medium text-text-secondary">
              Score {score}/100
            </span>
          )}
        </div>
      )}
    </div>
  );
};
