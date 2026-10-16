import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenApi, type DeveloperToken } from '../api/tokenApi';
import { tokenKeys } from '../api/token.keys';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Key, Plus, Trash2, RefreshCw, Copy, Check, Clock, AlertCircle, Terminal } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const formatScopeLabel = (scope: string) => {
    switch (scope) {
        case 'scans:create': return 'Create scans';
        case 'scans:read': return 'Read scans';
        case 'findings:read': return 'Read findings';
        case 'analytics:read': return 'Read analytics';
        default: return scope;
    }
};

export function DeveloperTokens({ workspaceId }: { workspaceId: string }) {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTokenName, setNewTokenName] = useState('');
    const [expiresInDays, setExpiresInDays] = useState('90');
    const [selectedScopes, setSelectedScopes] = useState<string[]>(['scans:create', 'scans:read']);
    const [scopeError, setScopeError] = useState('');
    
    // Store the newly created/rotated plaintext token to show to the user exactly once
    const [plaintextToken, setPlaintextToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const { data: tokens = [], isLoading } = useQuery({
        queryKey: tokenKeys.list(workspaceId),
        queryFn: () => tokenApi.listTokens(workspaceId)
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string, scopes: string[], expiresAt: string | null }) => 
            tokenApi.createToken(workspaceId, data.name, data.scopes, data.expiresAt),
        onSuccess: (data) => {
            setPlaintextToken(data.token);
            setIsCreateModalOpen(false);
            setNewTokenName('');
            setExpiresInDays('90');
            setSelectedScopes(['scans:create', 'scans:read']);
            queryClient.invalidateQueries({ queryKey: tokenKeys.list(workspaceId) });
        }
    });

    const revokeMutation = useMutation({
        mutationFn: (tokenId: string) => tokenApi.revokeToken(workspaceId, tokenId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: tokenKeys.list(workspaceId) })
    });

    const rotateMutation = useMutation({
        mutationFn: (tokenId: string) => tokenApi.rotateToken(workspaceId, tokenId),
        onSuccess: (data) => {
            setPlaintextToken(data.token);
            queryClient.invalidateQueries({ queryKey: tokenKeys.list(workspaceId) });
        }
    });

    const toggleScope = (scope: string, checked: boolean) => {
        setScopeError('');
        setSelectedScopes(prev => 
            checked ? [...prev, scope] : prev.filter(s => s !== scope)
        );
    };

    const handleCreateToken = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newTokenName.trim();
        if (!trimmedName) return;

        if (selectedScopes.length === 0) {
            setScopeError('Select at least one permission.');
            return;
        }

        let expiresAt = null;
        if (expiresInDays !== 'never') {
            const date = new Date();
            date.setDate(date.getDate() + parseInt(expiresInDays, 10));
            expiresAt = date.toISOString();
        }

        createMutation.mutate({ name: trimmedName, scopes: selectedScopes, expiresAt });
    };

    const copyToClipboard = () => {
        if (plaintextToken) {
            navigator.clipboard.writeText(plaintextToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getTokenStatus = (token: DeveloperToken) => {
        if (token.revoked_at) return { label: 'Revoked', className: 'bg-risk-critical-alpha text-risk-critical border-risk-critical-alpha' };
        if (token.expires_at && isPast(new Date(token.expires_at))) return { label: 'Expired', className: 'bg-risk-high-alpha text-risk-high border-risk-high-alpha' };
        return { label: 'Active', className: 'bg-risk-low-alpha text-risk-low border-risk-low-alpha' };
    };

    const openCreateModal = () => {
        setNewTokenName('');
        setExpiresInDays('90');
        setSelectedScopes(['scans:create', 'scans:read']);
        setScopeError('');
        setIsCreateModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-primary-base/20 bg-primary-alpha text-xs text-text-primary">
                <div className="flex items-center gap-2.5">
                    <Terminal className="w-4 h-4 text-primary-base shrink-0" />
                    <div>
                        <span className="font-semibold text-text-primary">Oculus CLI Integration:</span>
                        <span className="text-text-secondary ml-1">Authenticate terminal scans using these developer tokens.</span>
                    </div>
                </div>
                <Link
                    to={`/w/${workspaceId}/cli#authentication`}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary-base hover:underline shrink-0"
                >
                    <span>View CLI Guide & Setup →</span>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary-base" />
                            Developer Tokens
                        </CardTitle>
                        <CardDescription>
                            Manage API tokens for CI/CD integrations and CLI access.
                        </CardDescription>
                    </div>
                    <Button onClick={openCreateModal}>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Token
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-text-tertiary">Loading tokens...</div>
                    ) : tokens.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-border-base rounded-md">
                            <Key className="w-10 h-10 text-border-strong mx-auto mb-3" />
                            <h3 className="text-text-primary font-medium mb-1">No developer tokens</h3>
                            <p className="text-text-secondary text-sm mb-4">Create a token to authenticate your CI/CD pipelines.</p>
                            <Button variant="outline" onClick={openCreateModal}>
                                Generate First Token
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tokens.map(token => {
                                const status = getTokenStatus(token);
                                return (
                                    <div key={token.id} className="flex items-start justify-between p-4 bg-bg-surface border border-border-subtle rounded-md">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-text-primary">{token.name}</span>
                                                <Badge variant="outline" className={`${status.className}`}>{status.label}</Badge>
                                            </div>
                                            <div className="text-sm font-mono text-text-tertiary">
                                                ocx_live_{token.token_prefix}_********************************
                                            </div>
                                            
                                            {/* Human Readable Scopes Display */}
                                            {token.scopes && token.scopes.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {token.scopes.map(scope => (
                                                        <Badge key={scope} variant="outline" className="bg-bg-base text-xs font-normal">
                                                            {formatScopeLabel(scope)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-xs text-text-tertiary mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {token.expires_at ? `Expires ${new Date(token.expires_at).toLocaleDateString()}` : 'Never expires'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {token.last_used_at ? `Last used ${formatDistanceToNow(new Date(token.last_used_at))} ago` : 'Never used'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-1">
                                            {status.label === 'Active' && (
                                                <>
                                                    <Button variant="outline" size="sm" onClick={() => rotateMutation.mutate(token.id)} disabled={rotateMutation.isPending}>
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                        Rotate
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="text-risk-critical border-risk-critical-alpha hover:bg-risk-critical-alpha" onClick={() => revokeMutation.mutate(token.id)} disabled={revokeMutation.isPending}>
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Revoke
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Token Modal */}
            <Dialog 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)}
                title="Generate Developer Token"
                description="Tokens grant only the permissions selected below. Treat developer tokens like passwords and store them securely."
                className="sm:max-w-xl"
            >
                <form onSubmit={handleCreateToken} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium leading-none text-text-primary">Token Name</label>
                        <Input id="name" value={newTokenName} onChange={e => setNewTokenName(e.target.value)} placeholder="e.g. GitHub Actions Production" required />
                    </div>
                    
                    {/* Scope Selector */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium leading-none text-text-primary">Permissions</label>
                        
                        <div className="space-y-4 rounded-md border border-border-subtle p-4 bg-bg-base/50">
                            {/* Group: SCAN */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">Scan</h4>
                                <label className="flex items-start space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedScopes.includes('scans:create')}
                                        onChange={(e) => toggleScope('scans:create', e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-border-strong text-primary-base focus:ring-primary-base bg-bg-surface"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-text-primary">Create scans</span>
                                        <span className="text-xs text-text-secondary">Trigger security scans for repositories.</span>
                                    </div>
                                </label>
                                <label className="flex items-start space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedScopes.includes('scans:read')}
                                        onChange={(e) => toggleScope('scans:read', e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-border-strong text-primary-base focus:ring-primary-base bg-bg-surface"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-text-primary">Read scans</span>
                                        <span className="text-xs text-text-secondary">Read scan status and results.</span>
                                    </div>
                                </label>
                            </div>
                            
                            {/* Group: FINDINGS */}
                            <div className="space-y-3 pt-2 border-t border-border-subtle">
                                <h4 className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">Findings</h4>
                                <label className="flex items-start space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedScopes.includes('findings:read')}
                                        onChange={(e) => toggleScope('findings:read', e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-border-strong text-primary-base focus:ring-primary-base bg-bg-surface"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-text-primary">Read findings</span>
                                        <span className="text-xs text-text-secondary">Read security findings generated by scans.</span>
                                    </div>
                                </label>
                            </div>

                            {/* Group: ANALYTICS */}
                            <div className="space-y-3 pt-2 border-t border-border-subtle">
                                <h4 className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">Analytics</h4>
                                <label className="flex items-start space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedScopes.includes('analytics:read')}
                                        onChange={(e) => toggleScope('analytics:read', e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-border-strong text-primary-base focus:ring-primary-base bg-bg-surface"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-text-primary">Read analytics</span>
                                        <span className="text-xs text-text-secondary">Read workspace analytics available to the token.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        {scopeError && <p className="text-sm text-risk-critical font-medium mt-1">{scopeError}</p>}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="expiresIn" className="text-sm font-medium leading-none text-text-primary">Expiration</label>
                        <select 
                            id="expiresIn" 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-border-strong bg-bg-base px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-base focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={expiresInDays}
                            onChange={e => setExpiresInDays(e.target.value)}
                        >
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="never">Never (Not Recommended)</option>
                        </select>
                    </div>
                    
                    <div className="pt-2 flex justify-end gap-2 border-t border-border-subtle mt-6">
                        <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>Generate</Button>
                    </div>
                </form>
            </Dialog>

            {/* Show Plaintext Token Modal */}
            <Dialog 
                isOpen={!!plaintextToken} 
                onClose={() => setPlaintextToken(null)}
                title="Save Your Token"
                description={<span className="text-risk-critical font-medium">Please copy your developer token now. For security reasons, it cannot be shown again.</span>}
            >
                <div className="flex items-center space-x-2 my-4">
                    <Input readOnly value={plaintextToken || ''} className="font-mono text-sm" />
                    <Button type="button" size="icon" className="shrink-0" onClick={copyToClipboard}>
                        {copied ? <Check className="w-4 h-4 text-risk-low" /> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>
                <div className="pt-4 flex justify-end border-t border-border-subtle mt-6">
                    <Button type="button" onClick={() => setPlaintextToken(null)}>I have saved it safely</Button>
                </div>
            </Dialog>
        </div>
    );
}
