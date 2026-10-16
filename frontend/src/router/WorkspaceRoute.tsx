import React, { useEffect } from 'react';
import { useParams, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspace } from '@/features/workspace/hooks/useWorkspace';
import { useWorkspaceSocket } from '@/features/workspace/hooks/useWorkspaceSocket';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { repositoryKeys } from '@/features/repositories/api/repository.keys';
import { scanKeys } from '@/features/scans/api/scan.keys';
import { findingKeys } from '@/features/findings/api/finding.keys';
import { analyticsKeys } from '@/features/analytics/api/analytics.keys';

const isValidUUID = (id?: string) => 
  id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

export const WorkspaceRoute: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { setActiveWorkspace } = useWorkspaceStore();
  const isUUID = isValidUUID(workspaceId);
  
  // 1. Fetch workspace details (unconditionally)
  const { data: workspace, isLoading, error } = useWorkspace(isUUID ? workspaceId : undefined);

  // 2. Bind Sockets (unconditionally)
  useWorkspaceSocket(isUUID && workspaceId ? workspaceId : '');

  // 3. Lifecycle Tracking & Cascade Invalidation
  useEffect(() => {
    if (!isUUID || !workspaceId) return;

    setActiveWorkspace(workspaceId);
    
    // Invalidate dependent domains when workspace changes
    queryClient.invalidateQueries({ queryKey: repositoryKeys.all() });
    queryClient.invalidateQueries({ queryKey: scanKeys.all() });
    queryClient.invalidateQueries({ queryKey: findingKeys.all() });
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all() });
    
  }, [workspaceId, isUUID, setActiveWorkspace, queryClient]);

  // 4. Validate UUID structure
  if (!workspaceId || !isUUID) {
    toast.error("Invalid Workspace ID");
    return <Navigate to="/404" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <Loader2 className="w-8 h-8 animate-spin text-primary-base" />
      </div>
    );
  }

  // 5. Handle HTTP Errors (401, 403, 404)
  if (error || !workspace) {
    const status = (error as any)?.response?.status;
    
    if (status === 401) {
      toast.error('Session expired. Please login again.');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (status === 403) {
      toast.error('Access Denied. You do not belong to this workspace.');
      return <Navigate to="/404" replace />;
    }

    if (status === 404) {
      toast.error('Workspace not found or has been archived.');
      return <Navigate to="/404" replace />;
    }

    toast.error('An unexpected error occurred loading the workspace.');
    return <Navigate to="/404" replace />;
  }

  return <Outlet />;
};
