import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface AuthErrorMessageProps {
  error: string | null;
}

export const AuthErrorMessage: React.FC<AuthErrorMessageProps> = ({ error }) => {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm flex items-start space-x-3"
    >
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <span>{error}</span>
    </motion.div>
  );
};
