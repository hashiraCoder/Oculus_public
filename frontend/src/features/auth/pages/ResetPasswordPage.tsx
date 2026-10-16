import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas/authSchemas';
import { useResetPassword } from '../hooks/useAuth';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { mapBackendErrorsToForm } from '../utils/authErrorMapper';
import { AuthErrorMessage } from '../components/AuthErrorMessage';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch('password');
  const { mutate: resetPasswordMutation, isPending: isResetPending } = useResetPassword();

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) {
      setServerError('Reset token is missing or invalid.');
      return;
    }
    
    setServerError(null);
    resetPasswordMutation({ ...data, token }, {
      onSuccess: () => {
        try {
          setIsSuccess(true);
          navigate('/login');
        } catch (navigationError) {
          console.error('[Auth Error] Navigation failed after reset password', navigationError);
        }
      },
      onError: (error: unknown) => {
        const unmappedError = mapBackendErrorsToForm(
          error,
          setError,
          ['password', 'confirmPassword']
        );
        
        if (unmappedError) {
          setServerError(unmappedError);
        }
        
        const firstErrorField = Object.keys(errors)[0] as keyof ResetPasswordFormData;
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
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Set New Password</h1>
            <p className="text-text-secondary text-xs mt-0.5 text-center">
              Choose a strong passphrase for your account
            </p>
          </div>

          {!token ? (
            <div className="text-center">
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-2 rounded-md mb-4 text-xs">
                Invalid or expired reset token. Please request a new recovery link.
              </div>
              <Link
                to="/forgot-password"
                className="w-full bg-primary-base text-[#08090C] font-semibold text-xs py-2.5 rounded-md hover:bg-primary-hover transition-colors inline-block text-center"
              >
                Request New Link
              </Link>
            </div>
          ) : isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary mb-1">Password Updated</h2>
              <p className="text-xs text-text-secondary mb-5">
                Your credentials have been securely updated. Redirecting to login...
              </p>
            </motion.div>
          ) : (
            <>
              <AuthErrorMessage error={serverError} />

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-text-secondary mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      autoComplete="new-password"
                      disabled={isSubmitting || isResetPending}
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
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword')}
                      autoComplete="new-password"
                      disabled={isSubmitting || isResetPending}
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
                  disabled={isSubmitting || isResetPending}
                  className="w-full bg-primary-base text-[#08090C] font-semibold text-xs py-2.5 rounded-md hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-4 cursor-pointer"
                >
                  {isSubmitting || isResetPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Save New Password</span>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center border-t border-border-subtle pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
