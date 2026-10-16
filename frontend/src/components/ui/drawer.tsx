import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | 'full';
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: DrawerProps) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    md: 'w-full sm:max-w-md',
    lg: 'w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
    xl: 'w-full sm:max-w-2xl md:max-w-5xl',
    full: 'w-full',
  };

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-bg-root/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              'fixed inset-y-0 right-0 z-[70] flex flex-col bg-bg-base shadow-drawer border-l border-border-base h-full max-h-screen',
              sizeClasses[size]
            )}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-bg-base border-b border-border-base shrink-0">
              <div className="min-w-0 pr-4">
                {title && <h2 className="text-base sm:text-lg font-semibold text-text-primary truncate">{title}</h2>}
                {description && <p className="text-xs sm:text-sm text-text-secondary truncate">{description}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer" className="shrink-0 h-8 w-8 text-text-secondary hover:text-text-primary">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
}
