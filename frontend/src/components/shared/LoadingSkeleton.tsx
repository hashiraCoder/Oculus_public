import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="p-6 text-slate-50 animate-pulse">
      <div className="h-8 w-48 bg-slate-800 rounded mb-4"></div>
      <div className="h-64 w-full bg-slate-800 rounded"></div>
    </div>
  );
};
