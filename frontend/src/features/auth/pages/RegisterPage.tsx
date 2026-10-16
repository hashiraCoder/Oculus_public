import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { registerSchema, type RegisterFormData } from '../schemas/authSchemas';
import { useRegister } from '../hooks/useAuth';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { mapBackendErrorsToForm } from '../utils/authErrorMapper';
import { AuthErrorMessage } from '../components/AuthErrorMessage';

export const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password');
  const { mutate: registerMutation, isPending: isRegisterPending } = useRegister();

  const onSubmit = (data: RegisterFormData) => {
    setServerError(null);
    registerMutation(data, {
      onSuccess: (authViewModel) => {
        try {
          toast.success('Registration successful. Default workspace created.');
          if (authViewModel.workspaces && authViewModel.workspaces.length > 0) {
            navigate(`/w/${authViewModel.workspaces[0].id}`);
          }
        } catch (navigationError) {
          console.error('[Auth Error] Navigation failed after registration', navigationError);
        }
      },
      onError: (error: any) => {
        if (error.response?.status === 409) {
          setError('email', { type: 'server', message: 'Email is already registered.' });
          toast.error('An account with this email already exists. Please sign in.');
          setFocus('email');
          return;
        }

        const unmappedError = mapBackendErrorsToForm(
          error,
          setError,
          ['name', 'email', 'password', 'confirmPassword']
        );
        
        if (unmappedError) {
          setServerError(unmappedError);
        }
        
        const firstErrorField = Object.keys(errors)[0] as keyof RegisterFormData;
        if (firstErrorField) setFocus(firstErrorField);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-root p-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="bg-bg-surface border border-border-normal rounded-xl shadow-modal p-7">
          <div className="flex flex-col items-center mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Shield className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
            </div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Create Oculus Account</h1>
            <p className="text-text-secondary text-xs mt-0.5 text-center">
              Deploy continuous application security
            </p>
          </div>

          <AuthErrorMessage error={serverError} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-text-secondary mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                autoComplete="name"
                disabled={isSubmitting || isRegisterPending}
                className="w-full bg-bg-base border border-border-normal rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-base focus:outline-none transition-colors"
                placeholder="Alex DevSec"
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-risk-critical">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text-secondary mb-1">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                autoComplete="email"
                disabled={isSubmitting || isRegisterPending}
                className="w-full bg-bg-base border border-border-normal rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-base focus:outline-none transition-colors"
                placeholder="alex@oculus.security"
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-risk-critical">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text-secondary mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  autoComplete="new-password"
                  disabled={isSubmitting || isRegisterPending}
                  className="w-full bg-bg-base border border-border-normal rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-base focus:outline-none transition-colors pr-9"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={passwordValue} />
              {errors.password && (
                <p className="mt-1 text-[11px] text-risk-critical">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-text-secondary mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  autoComplete="new-password"
                  disabled={isSubmitting || isRegisterPending}
                  className="w-full bg-bg-base border border-border-normal rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-base focus:outline-none transition-colors pr-9"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-[11px] text-risk-critical">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isRegisterPending}
              className="w-full bg-primary-base text-[#08090C] font-semibold text-xs py-2.5 rounded-md hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-4 cursor-pointer"
            >
              {isSubmitting || isRegisterPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating organization...</span>
                </>
              ) : (
                <span>Register Organization</span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-text-tertiary border-t border-border-subtle pt-4">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-base font-semibold hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
