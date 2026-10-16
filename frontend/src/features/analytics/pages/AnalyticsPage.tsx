import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SummaryWidget } from '../components/SummaryWidget';
import { SecurityPostureWidget } from '../components/SecurityPostureWidget';
import { TrendWidget } from '../components/TrendWidget';
import { DistributionWidget } from '../components/DistributionWidget';
import { RepositoryRankingWidget } from '../components/RepositoryRankingWidget';
import { LeaderboardWidget } from '../components/LeaderboardWidget';
import { ExportWidget } from '../../export/components/ExportWidget';
import { useAnalyticsSocket } from '../hooks/useAnalyticsSocket';

export const AnalyticsPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL State Persistence for Tab
  const activeTab = searchParams.get('tab') || 'overview';
  
  // URL State for specific filters (example of URL state persistence for dashboard filtering)
  // const timeRange = searchParams.get('timeRange') || '30d';

  // Wire up targeted invalidations
  useAnalyticsSocket(workspaceId!);

  const handleTabChange = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'risk', label: 'Risk & Posture' },
    { id: 'repositories', label: 'Repositories' },
    { id: 'developers', label: 'Developers' },
    { id: 'exports', label: 'Exports' }
  ];

  if (!workspaceId) {
    return <div className="p-8 text-center text-risk-critical">Workspace ID is required</div>;
  }

  return (
    <div className="h-full w-full flex flex-col bg-bg-root text-text-primary overflow-hidden">
      <header className="px-6 py-4 border-b border-border-base bg-bg-surface shrink-0">
        <h1 className="text-xl font-bold">Analytics & Health</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex space-x-1 border-b border-border-base mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-primary-base border-primary-base'
                  : 'text-text-tertiary border-transparent hover:text-text-secondary hover:border-border-subtle'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1">
                    <SecurityPostureWidget workspaceId={workspaceId} />
                  </div>
                  <div className="lg:col-span-3">
                    <SummaryWidget workspaceId={workspaceId} />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <TrendWidget workspaceId={workspaceId} />
                   <DistributionWidget workspaceId={workspaceId} />
                </div>
              </div>
            )}

            {activeTab === 'risk' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TrendWidget workspaceId={workspaceId} />
                <DistributionWidget workspaceId={workspaceId} />
              </div>
            )}

            {activeTab === 'repositories' && (
              <div className="w-full">
                <RepositoryRankingWidget workspaceId={workspaceId} />
              </div>
            )}

            {activeTab === 'developers' && (
              <div className="w-full">
                <LeaderboardWidget workspaceId={workspaceId} />
              </div>
            )}

            {activeTab === 'exports' && (
              <div className="w-full">
                <ExportWidget workspaceId={workspaceId} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnalyticsPage;
