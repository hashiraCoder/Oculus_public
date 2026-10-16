import React from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface PasswordStrengthIndicatorProps {
  password?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password = '' }) => {
  const requirements = [
    { label: 'Minimum 12 characters', isValid: password.length >= 12 },
    { label: 'One uppercase letter', isValid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', isValid: /[a-z]/.test(password) },
    { label: 'One number', isValid: /[0-9]/.test(password) },
    { label: 'One special character', isValid: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="mt-3 space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
      <p className="text-xs font-medium text-slate-400 mb-2">Password must contain:</p>
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center space-x-2 text-sm">
          {req.isValid ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check className="w-4 h-4 text-emerald-500" />
            </motion.div>
          ) : (
            <X className="w-4 h-4 text-slate-600" />
          )}
          <span className={req.isValid ? 'text-slate-300' : 'text-slate-500'}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
};
