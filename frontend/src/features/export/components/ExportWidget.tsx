import React from 'react';
import { useExportFindings } from '../hooks/useExport';
import { FileJson, FileText, ShieldAlert, Download, XCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/authStore';

interface Props {
  workspaceId: string;
}

export const ExportWidget: React.FC<Props> = ({ workspaceId }) => {
  const { mutate: exportFindings, status, cancel } = useExportFindings();
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'viewer';

  const handleExport = (format: 'json' | 'csv' | 'sarif') => {
    if (isReadOnly) return;
    exportFindings({ workspaceId, format });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(['json', 'csv', 'sarif'] as const).map((format) => (
        <div key={format} className="bg-bg-surface p-6 rounded-lg border border-border-base flex flex-col items-center text-center space-y-4 hover:border-primary-base/50 transition-colors">
          <div className="p-3 bg-bg-root rounded-full border border-border-subtle">
            {format === 'json' && <FileJson className="w-6 h-6 text-blue-400" />}
            {format === 'csv' && <FileText className="w-6 h-6 text-green-400" />}
            {format === 'sarif' && <ShieldAlert className="w-6 h-6 text-purple-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">{format} Export</h3>
            <p className="text-xs text-text-tertiary mt-1">Download findings in {format.toUpperCase()} format</p>
          </div>
          
          {status === 'idle' ? (
            <button
              disabled={isReadOnly}
              onClick={() => handleExport(format)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-base hover:bg-primary-hover text-white rounded-md transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-primary-base font-medium flex items-center gap-2 bg-primary-base/10 px-3 py-1.5 rounded-md">
                <Loader2 className="w-3 h-3 animate-spin" />
                {status === 'generating' ? 'Generating...' : 'Downloading...'}
              </span>
              <button onClick={cancel} className="p-1.5 text-text-tertiary hover:text-risk-critical bg-bg-root rounded border border-border-base hover:border-risk-critical-alpha transition-colors" title="Cancel">
                 <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}
      
      {isReadOnly && (
         <div className="md:col-span-3 text-center text-xs text-text-tertiary mt-2">
            Exports are disabled for read-only viewers.
         </div>
      )}
    </div>
  );
};
