import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import { ErrorHandler, withErrorHandling, withRetry, AppError } from '../lib/errorHandling';
import { toastSuccess, toastError, toastLoading } from '../lib/toast';

interface AsyncOperationState {
  isLoading: boolean;
  error: AppError | null;
  lastSuccessData?: any;
}

interface AsyncOperationOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  enableRetry?: boolean;
  maxRetries?: number;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: AppError) => void;
}

export const useAsyncOperation = <T = any>() => {
  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
  });
  const { addToast, removeToast } = useToast();

  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      options: AsyncOperationOptions = {}
    ): Promise<{ success: boolean; data?: T; error?: AppError }> => {
      const {
        loadingMessage = 'Processing...',
        successMessage,
        errorMessage,
        enableRetry = false,
        maxRetries = 3,
        showSuccessToast = true,
        showErrorToast = true,
        onSuccess,
        onError,
      } = options;

      setState({ isLoading: true, error: null });

      // Show loading toast
      const loadingToastId = addToast(toastLoading(loadingMessage));

      try {
        const executeOperation = enableRetry
          ? () => withRetry(operation, maxRetries)
          : operation;

        const result = await withErrorHandling(executeOperation, 'async operation');

        // Remove loading toast
        removeToast(loadingToastId);

        if (result.error) {
          setState({ isLoading: false, error: result.error });

          if (showErrorToast) {
            addToast(toastError(
              errorMessage || result.error.userMessage,
              result.error.message,
              result.error.action
            ));
          }

          onError?.(result.error);
          return { success: false, error: result.error };
        }

        setState({
          isLoading: false,
          error: null,
          lastSuccessData: result.data,
        });

        if (showSuccessToast && successMessage) {
          addToast(toastSuccess(successMessage));
        }

        onSuccess?.(result.data);
        return { success: true, data: result.data };

      } catch (error) {
        // Remove loading toast
        removeToast(loadingToastId);

        const appError = ErrorHandler.handleSupabaseError(error as Error);
        setState({ isLoading: false, error: appError });

        if (showErrorToast) {
          addToast(toastError(
            errorMessage || appError.userMessage,
            appError.message,
            appError.action
          ));
        }

        onError?.(appError);
        return { success: false, error: appError };
      }
    },
    [addToast, removeToast]
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

// Specialized hooks for common operations
export const useCardOperation = () => {
  const asyncOp = useAsyncOperation();

  const activateCard = useCallback(
    (controlNumber: string, clinicCode: string) =>
      asyncOp.execute(
        async () => {
          // Your card activation logic here
          const response = await fetch('/api/cards/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ controlNumber, clinicCode }),
          });
          return response.json();
        },
        {
          loadingMessage: 'Activating card...',
          successMessage: 'Card activated successfully!',
          errorMessage: 'Failed to activate card',
        }
      ),
    [asyncOp]
  );

  const redeemPerk = useCallback(
    (cardId: string, perkId: string) =>
      asyncOp.execute(
        async () => {
          // Your perk redemption logic here
          const response = await fetch('/api/perks/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId, perkId }),
          });
          return response.json();
        },
        {
          loadingMessage: 'Redeeming perk...',
          successMessage: 'Perk redeemed successfully!',
          errorMessage: 'Failed to redeem perk',
        }
      ),
    [asyncOp]
  );

  return {
    ...asyncOp,
    activateCard,
    redeemPerk,
  };
};

export const useAuthOperation = () => {
  const asyncOp = useAsyncOperation();

  const login = useCallback(
    (credentials: { username: string; password: string }) =>
      asyncOp.execute(
        async () => {
          // Your login logic here
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });
          return response.json();
        },
        {
          loadingMessage: 'Signing in...',
          successMessage: 'Welcome back!',
          errorMessage: 'Login failed',
          showSuccessToast: false, // Usually handled by redirect
        }
      ),
    [asyncOp]
  );

  return {
    ...asyncOp,
    login,
  };
};