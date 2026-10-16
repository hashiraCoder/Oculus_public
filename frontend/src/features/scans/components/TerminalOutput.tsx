import { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TerminalLineViewModel } from '../types/scan.types';

interface TerminalOutputProps {
  logs: TerminalLineViewModel[];
  isLoading: boolean;
}

export const TerminalOutput = ({ logs, isLoading }: TerminalOutputProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22,
    overscan: 10,
  });

  useEffect(() => {
    if (parentRef.current && logs.length > 0) {
      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isAtBottom) {
        rowVirtualizer.scrollToIndex(logs.length - 1);
      }
    }
  }, [logs.length, rowVirtualizer]);

  return (
    <div className="bg-bg-root border border-border-subtle rounded-lg overflow-hidden shadow-surface">
      <div className="bg-bg-surface-alt px-3.5 py-2 border-b border-border-subtle flex items-center justify-between sticky top-0 z-10 select-none">
        <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold">
          <Terminal className="w-3.5 h-3.5 text-primary-base" />
          <span>Worker Execution Telemetry</span>
        </div>
        <span className="text-[10px] font-mono text-text-tertiary bg-bg-base px-2 py-0.5 rounded border border-border-subtle">
          {logs.length} lines
        </span>
      </div>
      
      <div 
        ref={parentRef} 
        className="h-[320px] overflow-auto p-3 font-mono text-[11px] text-text-secondary leading-relaxed bg-[#08090C]"
      >
        {isLoading ? (
          <div className="animate-pulse space-y-2 opacity-50 p-2">
            <div className="h-3 bg-border-normal rounded w-1/4" />
            <div className="h-3 bg-border-normal rounded w-1/2" />
            <div className="h-3 bg-border-normal rounded w-1/3" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-text-tertiary h-full flex items-center justify-center italic text-xs">
            Connecting to worker stdout stream...
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const log = logs[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex gap-3 hover:bg-bg-surface-hover/30 px-1 py-0.5 rounded"
                >
                  <span className="text-text-muted shrink-0 w-20 select-none">
                    {new Date(log.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`shrink-0 w-12 font-bold ${
                    log.level === 'error' ? 'text-rose-400' : 
                    log.level === 'warn' ? 'text-amber-400' : 
                    log.level === 'debug' ? 'text-text-muted' : 'text-cyan-400'
                  }`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className={`break-all ${log.level === 'error' ? 'text-rose-300' : 'text-text-primary'}`}>
                    {log.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
