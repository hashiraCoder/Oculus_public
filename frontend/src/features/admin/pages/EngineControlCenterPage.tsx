import React from 'react';
import { EngineHealthDashboard } from '../components/EngineHealthDashboard';
import { QueueMonitor } from '../components/QueueMonitor';
import { WorkerObservatory } from '../components/WorkerObservatory';
import { AlertsViewer } from '../components/AlertsViewer';
import { ScansViewer } from '../components/ScansViewer';
import { ShadowComparisonViewer } from '../components/ShadowComparisonViewer';
import { PromotionGatePanel } from '../components/PromotionGatePanel';

const EngineControlCenterPage: React.FC = () => {
  return (
    <div className="flex flex-col flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Engine Control Center</h1>
        <p className="text-sm text-text-secondary">
          Super Admin dashboard — system health, workers, scan telemetry, shadow comparison, and NEXT promotion.
        </p>
      </div>

      {/* Row 1: Engine health */}
      <EngineHealthDashboard />

      {/* Row 2: Queue + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueueMonitor />
        <AlertsViewer />
      </div>

      {/* Row 3: Workers */}
      <WorkerObservatory />

      {/* Row 4: Scans + Telemetry */}
      <ScansViewer />

      {/* Row 5: NEXT Engine — Shadow Comparison + Promotion Gate */}
      <div className="flex flex-col space-y-1 pt-2">
        <h2 className="text-lg font-semibold text-text-primary">NEXT Engine Shadow Analysis</h2>
        <p className="text-xs text-text-secondary">
          NEXT engine runs in shadow mode alongside V2. Results are compared but do not affect developer-visible findings.
        </p>
      </div>

      <ShadowComparisonViewer />
      <PromotionGatePanel />
    </div>
  );
};

export default EngineControlCenterPage;
