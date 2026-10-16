import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="p-6 text-slate-50 flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <Link to="/" className="text-blue-500 hover:underline">Go Home</Link>
    </div>
  );
};

export default NotFoundPage;
