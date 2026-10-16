import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Shield, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas/authSchemas';
import { useForgotPassword } from '../hooks/useAuth';
import { mapBackendErrorsToForm } from '../utils/authErrorMapper';
import { AuthErrorMessage } from '../components/AuthErrorMessage';

export const ForgotPasswordPage: React.FC = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const { mutate: forgotPasswordMutation, isPending: isForgotPending } = useForgotPassword();

  const onSubmit = (data: ForgotPasswordFormData) => {
    setServerError(null);
    forgotPasswordMutation(data, {
      onSuccess: () => {
        setIsSuccess(true);
      },
      onError: (error: unknown) => {
        const unmappedError = mapBackendErrorsToForm(
          error,
          setError,
          ['email']
        );
        
        if (unmappedError) {
          setServerError(unmappedError);
        }
        
        if (errors.email) setFocus('email');
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
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Reset Password</h1>
            <p className="text-text-secondary text-xs mt-0.5 text-center">
              Enter your work email to receive recovery instructions
            </p>
          </div>

          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary mb-1">Check your inbox</h2>
              <p className="text-xs text-text-secondary mb-5">
                We've sent password reset instructions to your email address.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-xs font-semibold text-primary-base hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to Sign In
              </Link>
            </motion.div>
          ) : (
            <>
              <AuthErrorMessage error={serverError} />

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-text-secondary mb-1">
                    Work Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    autoComplete="email"
                    disabled={isSubmitting || isForgotPending}
                    className="w-full bg-bg-base border border-border-normal rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-base focus:outline-none transition-colors"
                    placeholder="name@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-risk-critical">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isForgotPending}
                  className="w-full bg-primary-base text-[#08090C] font-semibold text-xs py-2.5 rounded-md hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-4 cursor-pointer"
                >
                  {isSubmitting || isForgotPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
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
