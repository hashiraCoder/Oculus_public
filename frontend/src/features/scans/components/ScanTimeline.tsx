import { Check, Clock, X, Loader2 } from 'lucide-react';
import type { TimelineItemViewModel } from '../types/scan.types';

interface ScanTimelineProps {
  timeline: TimelineItemViewModel[];
}

export const ScanTimeline = ({ timeline }: ScanTimelineProps) => {
  const steps = [
    { type: 'scan_queued', label: '1. Queue & Dispatch' },
    { type: 'repo_cloned', label: '2. Source Code Clone' },
    { type: 'dependencies_restored', label: '3. Dependency Graph' },
    { type: 'sast_analyzing', label: '4. Static Security Engines' },
    { type: 'scan_completed', label: '5. CI Gate & Persistence' }
  ];

  return (
    <div className="relative border-l border-border-normal ml-3 space-y-4 py-1">
      {steps.map((step, index) => {
        const event = timeline.find(t => t.type === step.type || (step.type === 'scan_queued' && t.type === 'scan_started'));
        const isCompleted = !!event;
        const isCurrent = timeline.length > 0 && index === timeline.length;
        const isFailed = step.type === 'scan_completed' && event?.payload?.conclusion === 'failure';

        return (
          <div key={step.type} className="relative pl-5 text-xs">
            {/* Step Dot */}
            <div className="absolute -left-[9px] top-0.5 bg-bg-surface">
              {isFailed ? (
                <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
                  <X className="w-2.5 h-2.5" />
                </div>
              ) : isCompleted ? (
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                  <Check className="w-2.5 h-2.5" />
                </div>
              ) : isCurrent ? (
                <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full bg-bg-surface-hover border border-border-normal" />
              )}
            </div>
            
            {/* Step Content */}
            <div className={isCompleted || isCurrent ? "text-text-primary" : "text-text-muted"}>
              <h4 className="font-semibold text-xs leading-none">
                {step.label}
              </h4>
              {event && (
                <p className="text-[10px] text-text-tertiary mt-1 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {new Date(event.time).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
