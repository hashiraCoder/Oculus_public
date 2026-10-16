import type { Repository } from '@/types/common.types';
import { RiskGradeBadge } from '@/components/security/RiskGradeBadge'; // Assuming this exists
import { ShieldAlert, GitBranch, Lock, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RepositoryCardProps {
  repository: Repository;
  workspaceId: string;
}

export const RepositoryCard = ({ repository, workspaceId }: RepositoryCardProps) => {
  const getProgressColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Link to={`/w/${workspaceId}/repositories/${repository.id}`}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
            {repository.is_private ? <Lock size={20} className="text-zinc-400" /> : <Globe size={20} className="text-zinc-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{repository.name}</h3>
              <span className="text-xs text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                {repository.is_private ? 'Private' : 'Public'}
              </span>
            </div>
            <p className="text-sm text-zinc-400">{repository.full_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1 w-32">
            <div className="flex justify-between items-center text-xs text-zinc-400">
              <span>Risk Score</span>
              <span>{repository.current_risk_score || 0}/100</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${getProgressColor(repository.current_risk_score || 0)}`}
                style={{ width: `${repository.current_risk_score || 0}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 mb-1">Grade</span>
              <RiskGradeBadge grade={repository.current_risk_grade || 'C'} />
            </div>

            <div className="flex items-center gap-4 text-zinc-400">
              <div className="flex items-center gap-1">
                <ShieldAlert size={16} />
                <span className="text-sm">{repository.critical_findings || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch size={16} />
                <span className="text-sm">{repository.default_branch || 'main'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
