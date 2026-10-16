import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { classifyError } from '@/lib/errors/errorClassifier';

export const mapBackendErrorsToForm = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: (keyof T)[]
): string | null => {
  const classified = classifyError(error);

  if (classified.type === 'ERR_NETWORK') {
    return 'Unable to connect to the server. Please try again.';
  }

  if (classified.type === 'TIMEOUT' || classified.type === 'ERR_CANCELED') {
    return 'Request timed out or was cancelled.';
  }

  if (classified.type === 'JS_RUNTIME') {
    console.error('[Auth Mapper] JS Runtime Exception caught in error mapper:', classified.originalError);
    return 'Something went wrong. Please try again.';
  }

  if (classified.type === 'TOO_MANY_REQUESTS' || classified.status === 429) {
    return 'Too many requests. Please try again later.';
  }

  if (classified.type === 'SERVER_ERROR' || (classified.status && classified.status >= 500)) {
    return 'Something went wrong on our server. Please try again later.';
  }

  if (classified.type === 'UNAUTHORIZED' || classified.status === 401) {
    if (fields.includes('email' as keyof T) && fields.includes('password' as keyof T)) {
      setError('email' as Path<T>, { type: 'server', message: 'Invalid email or password.' });
      setError('password' as Path<T>, { type: 'server', message: 'Invalid email or password.' });
      return null;
    }
    return 'Invalid email or password.';
  }

  if (classified.type === 'CONFLICT' || classified.status === 409) {
    if (fields.includes('email' as keyof T)) {
      setError('email' as Path<T>, { type: 'server', message: 'An account with this email already exists. Please log in.' });
      return null;
    }
    return 'An account with this email already exists. Please log in.';
  }

  const data = classified.data;
  if (data && Array.isArray(data.errors)) {
    let unmappedErrors: string[] = [];
    
    data.errors.forEach((errorMsg: string) => {
      const lowerError = String(errorMsg).toLowerCase();
      const matchedField = fields.find((field) => lowerError.includes(String(field).toLowerCase()));
      
      if (matchedField) {
        setError(matchedField as Path<T>, { type: 'server', message: errorMsg });
      } else {
        unmappedErrors.push(errorMsg);
      }
    });

    return unmappedErrors.length > 0 ? unmappedErrors.join('. ') : null;
  }
  
  if (classified.message && classified.type !== 'UNKNOWN') {
    const lowerError = classified.message.toLowerCase();
    
    if (lowerError.includes('jwt') || lowerError.includes('expired')) {
        return 'Session expired. Please login again.';
    }

    const matchedField = fields.find((field) => lowerError.includes(String(field).toLowerCase()));
    
    if (matchedField) {
      setError(matchedField as Path<T>, { type: 'server', message: classified.message });
      return null;
    }

    return classified.message;
  }

  return 'Something went wrong. Please try again.';
};
