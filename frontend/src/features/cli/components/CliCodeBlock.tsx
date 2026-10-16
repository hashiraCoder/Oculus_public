import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CliCodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export const CliCodeBlock: React.FC<CliCodeBlockProps> = ({
  code,
  language = 'bash',
  title,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      toast.success('Command copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy command');
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle bg-bg-root overflow-hidden shadow-surface group relative font-mono text-xs text-text-primary transition-all duration-150 hover:border-border-normal',
        className
      )}
    >
      {/* Chrome header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border-subtle bg-bg-surface-alt/60 select-none">
        <div className="flex items-center gap-2 text-text-tertiary">
          <Terminal className="w-3.5 h-3.5 text-primary-base" />
          <span className="text-[11px] font-medium text-text-secondary">
            {title || language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          aria-label={copied ? 'Copied to clipboard' : 'Copy command to clipboard'}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
            copied
              ? 'bg-primary-alpha text-primary-base border border-primary-base/30'
              : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover border border-transparent'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-primary-base" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="p-3.5 overflow-x-auto text-[11.5px] leading-relaxed text-text-primary bg-[#08090C]">
        <pre className="m-0 font-mono selection:bg-primary-alpha selection:text-primary-base whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
