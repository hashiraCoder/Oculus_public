import type { Notification } from '@/stores/notificationsStore';

export const formatNotification = (raw: any, workspaceId: string): Omit<Notification, 'read'> => {
  const type = raw.event_type || raw.type || raw.event;
  // Handle both DB payload string and real-time structured payload
  const payloadStr = typeof raw.payload === 'string' ? raw.payload : '{}';
  const payload = typeof raw.payload === 'object' && raw.payload !== null ? raw.payload : (
    (typeof payloadStr === 'string' && payloadStr.startsWith('{')) ? JSON.parse(payloadStr) : {}
  );
  
  // Realtime events might send the data payload directly in `raw.data` instead of `raw.payload`
  const eventData = raw.data || payload;

  // Use repoName from data if available, else fallback to repoId or 'Repository'
  const repoName = eventData.repoName || eventData.repo_name || eventData.repoId || 'Repository';
  
  const timestamp = new Date(raw.created_at || raw.timestamp || eventData.timestamp || Date.now());
  const id = raw.id || Math.random().toString(36).substring(7);

  let title = raw.notification_type || type;
  let message = '';
  
  // Fallback severity logic
  let severity: Notification['severity'] = 
    raw.severity === 'HIGH' || raw.severity === 'CRITICAL' ? 'error' : 
    raw.severity === 'MEDIUM' ? 'warning' : 'info';

  let actionLabel: string | undefined;
  let actionUrl: string | undefined;

  // Use the active workspace ID if the raw notification doesn't explicitly have one
  const targetWorkspaceId = raw.workspace_id || workspaceId;

  // Domain-specific formatting
  if (type === 'SCAN_COMPLETED' || type === 'oculus.scan.completed') {
    title = 'Security scan completed';
    const c = eventData.criticalCount || 0;
    const h = eventData.highCount || 0;
    const m = eventData.mediumCount || 0;
    const l = eventData.lowCount || 0;
    const total = c + h + m + l;
    
    // IMPORTANT: Check conclusion BEFORE checking total === 0.
    // An engine error produces conclusion='failure'/'error' with total=0 — this is
    // NOT a clean run. Without this guard, users receive a success toast on every
    // errored scan (because total_findings is 0 when persistence failed).
    const conclusion = eventData.conclusion || '';
    const isErrorConclusion = conclusion === 'failure' || conclusion === 'error' || conclusion === 'ERROR';

    if (isErrorConclusion) {
      title = 'Security scan error';
      message = `The scan for ${repoName} completed with an engine error. Results may be incomplete.`;
      severity = 'error';
    } else if (total === 0) {
      message = `No security vulnerabilities were detected in ${repoName}.`;
      severity = 'success';
    } else {
      const parts = [];
      if (c > 0) parts.push(`${c} critical`);
      if (h > 0) parts.push(`${h} high-severity`);
      if (parts.length === 0 && m > 0) parts.push(`${m} medium-severity`);
      if (parts.length === 0 && l > 0) parts.push(`${l} low-severity`);
      
      message = `${parts.join(' and ')} vulnerabilities found in ${repoName}.`;
      severity = c > 0 ? 'error' : h > 0 ? 'error' : m > 0 ? 'warning' : 'info';
    }

    if (eventData.scanId) {
      actionLabel = 'View scan';
      actionUrl = `/w/${targetWorkspaceId}/scans/${eventData.scanId}`;
    }
  } else if (type === 'SCAN_FAILED' || type === 'oculus.scan.failed') {
    title = 'Security scan failed';
    message = `The security scan for ${repoName} could not be completed.`;
    severity = 'error';
    if (eventData.scanId) {
      actionLabel = 'View details';
      actionUrl = `/w/${targetWorkspaceId}/scans/${eventData.scanId}`;
    }
  } else if (type === 'SCAN_STARTED' || type === 'oculus.scan.started') {
    title = 'Security scan started';
    message = `Oculus is analyzing ${repoName}.`;
    severity = 'info';
    if (eventData.scanId) {
      actionLabel = 'View progress';
      actionUrl = `/w/${targetWorkspaceId}/scans/${eventData.scanId}`;
    }
  } else if (type === 'SCAN_QUEUED' || type === 'oculus.scan.queued') {
    title = 'Security scan queued';
    message = `${repoName} has been added to the scan queue.`;
    severity = 'info';
    if (eventData.scanId) {
      actionLabel = 'View scan';
      actionUrl = `/w/${targetWorkspaceId}/scans/${eventData.scanId}`;
    }
  } else if (type === 'REPO_SYNC' || type === 'github_sync_completed') {
    title = 'Repository synchronized';
    message = `${repoName} was successfully synchronized with GitHub.`;
    severity = 'success';
    if (eventData.repoId) {
      actionLabel = 'View repository';
      actionUrl = `/w/${targetWorkspaceId}/repositories/${eventData.repoId}`;
    }
  } else {
    // Safe legacy fallback
    title = 'Security event';
    message = 'An event occurred in your workspace.';
    if (eventData.message || eventData.detail) {
      message = eventData.message || eventData.detail;
    }
  }

  return {
    id,
    type,
    title,
    message,
    severity,
    timestamp,
    actionLabel,
    actionUrl,
    metadata: eventData
  };
};
