import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0F172A] text-slate-50 font-sans">
      {/* Branding Panel */}
      <div className="hidden md:flex flex-col flex-1 items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-slate-900 border-r border-slate-800">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="z-10 text-center"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-2xl text-white">O</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Oculus</h1>
          </div>
          <p className="text-slate-400 text-lg max-w-sm mx-auto">
            Security Intelligence Platform
          </p>
        </motion.div>
        
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Form Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0F172A]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Branding (only visible on small screens) */}
          <div className="md:hidden flex items-center justify-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">O</span>
            </div>
            <h1 className="text-2xl font-bold">Oculus</h1>
          </div>

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};
