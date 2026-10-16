import { useState } from 'react';
import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, Server, Shield, Key, AlertTriangle, 
  Trash2, Copy, ExternalLink, Loader2, User, CheckCircle2, LogOut 
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { workspaceKeys } from '@/features/workspace/api/workspace.keys';
import { useWorkspace } from '@/features/workspace/hooks/useWorkspace';
import { WorkspaceRepository } from '@/features/workspace/repositories/workspace.repository';
import { useDisconnectGithub, useSyncGithub } from '@/features/github/hooks/useGithub';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { githubApi } from '@/features/github/api/githubApi';
import { settingsApi } from '@/features/settings/api/settingsApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { DeveloperTokens } from '../components/DeveloperTokens';

export function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { mutate: logout } = useLogout();
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'tokens' | 'github' | 'policies'>('profile');
  const [isDeleting, setIsDeleting] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const { data: workspace } = useWorkspace(workspaceId);
  const { mutate: disconnectGithub, isPending: isDisconnecting } = useDisconnectGithub();
  const { mutate: syncGithub, isPending: isSyncing } = useSyncGithub();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (workspace?.name) setWorkspaceName(workspace.name);
  }, [workspace?.name]);
  
  useEffect(() => {
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');

    if (status && workspaceId) {
      if (status === 'connected') {
        toast.success('GitHub App connected successfully!');
        // Invalidate the workspace query so it refetches and shows 'Connected'
        queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      } else if (status === 'cancelled') {
        toast.info(reason === 'missing_state' ? 'GitHub installation was cancelled (missing state).' : 'GitHub installation cancelled.');
      } else if (status === 'failed') {
        toast.error(`GitHub installation failed: ${reason || 'Unknown error'}`);
      }
      
      // Clean up URL
      searchParams.delete('status');
      searchParams.delete('reason');
      setSearchParams(searchParams, { replace: true });
      setActiveTab('github');
    }
  }, [searchParams, workspaceId, setSearchParams, queryClient]);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      critical: 40,
      high: 20,
      medium: 5,
      low: 1
    }
  });

  useEffect(() => {
    if (!workspaceId) return;

    const loadRiskPolicies = async () => {
      try {
        const response = await settingsApi.getRiskPolicies(workspaceId);
        const weights = response?.weights ?? {
          critical: 40,
          high: 20,
          medium: 5,
          low: 1
        };
        reset(weights);
      } catch (error) {
        console.error('Failed to load risk policy weights', error);
      }
    };

    loadRiskPolicies();
  }, [workspaceId, reset]);

  const handleSyncGithub = () => {
    if (!workspaceId) return;
    syncGithub({ workspaceId, installationId: null });
  };

  const handleDisconnectGithub = () => {
    if (!workspaceId) return;
    disconnectGithub({ workspaceId });
  };

  const handleInstallApp = async () => {
    if (!workspaceId) return;
    setIsConnecting(true);
    try {
      const response = await githubApi.getInstallUrl(workspaceId);
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to generate GitHub installation URL.');
        setIsConnecting(false);
      }
    } catch {
      toast.error('Failed to generate GitHub installation URL.');
      setIsConnecting(false);
    }
  };

  const onSavePolicies = async (data: any) => {
    if (!workspaceId) return;

    try {
      await settingsApi.updateRiskPolicy(workspaceId, 'risk-weights', {
        critical: Number(data.critical),
        high: Number(data.high),
        medium: Number(data.medium),
        low: Number(data.low)
      });
      toast.success('Policies saved successfully');
    } catch (error) {
      console.error('Failed to save risk policy weights', error);
      toast.error('Failed to save policy settings');
    }
  };

  const handleSaveWorkspace = async () => {
    if (!workspaceId || !workspaceName.trim()) return;
    try {
      await WorkspaceRepository.updateWorkspace(workspaceId, workspaceName);
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      toast.success('Workspace updated');
    } catch (error) {
      console.error('Failed to update workspace', error);
      toast.error('Failed to update workspace');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId || !confirm('Are you absolutely sure? This action cannot be undone and will permanently delete this workspace and all associated data.')) return;
    setIsDeleting(true);
    try {
      await WorkspaceRepository.deleteWorkspace(workspaceId);
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      toast.success('Workspace deleted');
      navigate('/');
    } catch (error) {
      console.error('Failed to delete workspace', error);
      toast.error('Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'workspace', label: 'Workspace', icon: Server },
    { id: 'tokens', label: 'Developer Tokens', icon: Key },
    { id: 'github', label: 'GitHub', icon: GitBranch },
    { id: 'policies', label: 'Security Policies', icon: Shield },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto text-text-primary space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-text-secondary mt-1 text-sm">Manage your workspace preferences, integrations, and access controls.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-col space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-colors text-left text-sm font-medium ${
                  isActive 
                    ? 'bg-primary-alpha text-primary-base' 
                    : 'text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'profile' && user && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Profile</CardTitle>
                      <CardDescription>Your personal account details and session controls.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* User Identity Banner */}
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-bg-surface-alt border border-border-subtle">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-900 border border-emerald-500/30 flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0">
                          {user.initials || user.name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base text-text-primary">{user.name || 'Developer'}</h3>
                            <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                              {user.role || 'MEMBER'}
                            </Badge>
                            {user.isVerified && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5">{user.email}</p>
                        </div>
                      </div>

                      {/* Account Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-lg bg-bg-surface-alt border border-border-subtle space-y-1">
                          <span className="text-xs text-text-tertiary">User ID</span>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-text-secondary truncate">{user.id}</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(user.id)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-lg bg-bg-surface-alt border border-border-subtle space-y-1">
                          <span className="text-xs text-text-tertiary">Active Workspace</span>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-text-secondary truncate">{workspace?.name || workspaceId}</span>
                            {workspaceId && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(workspaceId)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Session Controls */}
                      <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-text-primary">Sign Out</h4>
                          <p className="text-xs text-text-tertiary mt-0.5">End your current session on this device.</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => logout()}
                          className="text-risk-critical hover:bg-risk-critical-alpha hover:border-risk-critical-border"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1.5" />
                          Logout
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'workspace' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Workspace Details</CardTitle>
                      <CardDescription>Basic information about your current workspace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Workspace Name</label>
                          <Input type="text" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="max-w-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Workspace ID</label>
                        <div className="flex max-w-md">
                          <Input type="text" readOnly value={workspaceId || ''} className="rounded-r-none font-mono text-text-tertiary bg-bg-surface" />
                          <Button variant="outline" className="rounded-l-none border-l-0 px-3" onClick={() => copyToClipboard(workspaceId || '')}>
                            <Copy className="w-4 h-4 text-text-secondary" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-border-subtle pt-4">
                      <Button variant="default" onClick={handleSaveWorkspace} disabled={!workspaceName.trim()}>Save Changes</Button>
                    </CardFooter>
                  </Card>

                  <Card className="border-risk-critical-alpha bg-bg-surface overflow-hidden">
                    <CardHeader className="bg-risk-critical-alpha/50 border-b border-risk-critical-alpha/50">
                      <CardTitle className="text-risk-critical flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                      </CardTitle>
                      <CardDescription className="text-risk-critical/80">
                        Destructive actions that cannot be undone.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-text-primary">Delete Workspace</h4>
                          <p className="text-sm text-text-secondary mt-1">Permanently remove this workspace, all repositories, scans, and findings. This action is irreversible.</p>
                        </div>
                        <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={isDeleting}>
                          {isDeleting ? 'Deleting...' : <><Trash2 className="w-4 h-4 mr-2" /> Delete Workspace</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'tokens' && workspaceId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <DeveloperTokens workspaceId={workspaceId} />
                </motion.div>
              )}

              {activeTab === 'github' && (
                <div className="space-y-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-bg-surface-hover border border-border-subtle rounded-lg">
                            <GitBranch className="w-8 h-8 text-text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-text-primary">GitHub Integration</h3>
                            <p className="text-sm text-text-secondary mt-0.5">Manage your GitHub App connection for automatic PR scanning.</p>
                          </div>
                        </div>
                      </div>
                      
                      {workspace?.hasGithubConnection ? (
                        <>
                          <div className="mt-8 pt-6 border-t border-border-subtle space-y-4">
                            <div className="flex items-center justify-between p-3 bg-bg-surface rounded-md border border-border-subtle">
                              <span className="text-sm font-medium text-text-secondary">Connection Status</span>
                              <Badge variant="default" className="bg-risk-low-alpha text-risk-low border-risk-low-alpha border">Connected</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-bg-surface rounded-md border border-border-subtle">
                              <span className="text-sm font-medium text-text-secondary">Connected Account</span>
                              <span className="text-sm font-medium text-text-primary">{workspace.githubAccountLogin || 'Unknown Account'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-bg-surface rounded-md border border-border-subtle">
                              <span className="text-sm font-medium text-text-secondary">Sync Status</span>
                              {workspace.githubSyncStatus === 'PENDING' && <Badge className="bg-risk-medium-alpha text-risk-medium border border-risk-medium-alpha">Pending</Badge>}
                              {workspace.githubSyncStatus === 'SYNCING' && <Badge className="bg-primary-alpha text-primary-base border border-primary-alpha flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Syncing</Badge>}
                              {workspace.githubSyncStatus === 'READY' && <Badge className="bg-risk-low-alpha text-risk-low border border-risk-low-alpha">Ready</Badge>}
                              {workspace.githubSyncStatus === 'FAILED' && <Badge className="bg-risk-critical-alpha text-risk-critical border border-risk-critical-alpha">Failed</Badge>}
                              {!workspace.githubSyncStatus && <span className="text-sm text-text-tertiary">Unknown</span>}
                            </div>
                          </div>

                          <div className="mt-6 flex gap-3">
                            <Button onClick={handleSyncGithub} disabled={isSyncing}>
                              {isSyncing ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                              Sync Repositories
                            </Button>
                            <Button variant="outline" onClick={handleDisconnectGithub} disabled={isDisconnecting} className="text-risk-critical border-border-base hover:bg-risk-critical-alpha hover:border-risk-critical/50">
                              {isDisconnecting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                              Disconnect App
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col items-center text-center p-6 bg-bg-surface border rounded-md border-dashed border-border-base">
                          {isConnecting ? (
                            <div className="flex flex-col items-center space-y-4">
                              <Loader2 className="w-8 h-8 animate-spin text-primary-base" />
                              <p className="text-text-secondary font-medium">Finalizing GitHub connection...</p>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-text-primary font-medium mb-2">Connect your GitHub Organization</h4>
                              <p className="text-text-secondary text-sm mb-6 max-w-md">Install the Oculus GitHub App on your repositories to enable continuous security scanning and real-time PR checks.</p>
                              <Button onClick={handleInstallApp}>
                                Install GitHub App <ExternalLink className="w-4 h-4 ml-2" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'policies' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Weights Configuration</CardTitle>
                      <CardDescription>Configure how different severity levels affect overall repository and workspace risk scores.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit(onSavePolicies)}>
                      <CardContent className="space-y-6">
                        <div className="p-4 bg-primary-alpha/30 border border-primary-alpha rounded-md text-sm text-primary-base flex items-start gap-3">
                          <Shield className="w-5 h-5 shrink-0" />
                          <p>These weights are used by the analytics engine to calculate the 0-100 Risk Grade. Adjusting these will immediately recalculate grades across all repositories.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-text-primary">Critical Finding Weight</label>
                            <Input type="number" {...register('critical')} />
                            <p className="text-xs text-text-tertiary">Default: 40 points</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-text-primary">High Finding Weight</label>
                            <Input type="number" {...register('high')} />
                            <p className="text-xs text-text-tertiary">Default: 20 points</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-text-primary">Medium Finding Weight</label>
                            <Input type="number" {...register('medium')} />
                            <p className="text-xs text-text-tertiary">Default: 5 points</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-text-primary">Low Finding Weight</label>
                            <Input type="number" {...register('low')} />
                            <p className="text-xs text-text-tertiary">Default: 1 point</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-border-subtle pt-4">
                        <Button type="submit">Save Policy Configurations</Button>
                      </CardFooter>
                    </form>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
