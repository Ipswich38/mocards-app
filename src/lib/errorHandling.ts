import { PostgrestError } from '@supabase/supabase-js';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export class ErrorHandler {
  static handleSupabaseError(error: PostgrestError | Error | null): AppError {
    if (!error) {
      return this.createError('UNKNOWN_ERROR', 'An unexpected error occurred');
    }

    // Handle PostgrestError (Supabase errors)
    if ('code' in error && error.code) {
      switch (error.code) {
        case 'PGRST116':
          return this.createError(
            'NO_ROWS_FOUND',
            'The requested item was not found',
            'Please check the information and try again'
          );
        case 'PGRST301':
          return this.createError(
            'PERMISSION_DENIED',
            'You do not have permission to perform this action',
            'Please contact your administrator if you believe this is an error'
          );
        case '23505':
          return this.createError(
            'DUPLICATE_ENTRY',
            'This item already exists',
            'Please check for duplicates or use a different identifier'
          );
        case '23503':
          return this.createError(
            'FOREIGN_KEY_VIOLATION',
            'Cannot complete action due to related data',
            'Please ensure all required data is properly set up'
          );
        default:
          return this.createError(
            error.code,
            error.message,
            'Please try again or contact support if the problem persists'
          );
      }
    }

    // Handle generic JavaScript errors
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return this.createError(
          'NETWORK_ERROR',
          'Network connection failed',
          'Please check your internet connection and try again'
        );
      }

      if (error.message.includes('JSON')) {
        return this.createError(
          'DATA_FORMAT_ERROR',
          'Invalid data format received',
          'The server returned unexpected data. Please try again'
        );
      }

      return this.createError(
        'GENERIC_ERROR',
        error.message,
        'An unexpected error occurred. Please try again'
      );
    }

    return this.createError('UNKNOWN_ERROR', 'An unknown error occurred');
  }

  static handleValidationError(field: string, _value: any, rule: string): AppError {
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);

    switch (rule) {
      case 'required':
        return this.createError(
          'VALIDATION_REQUIRED',
          `${fieldName} is required`,
          `Please enter a valid ${field.toLowerCase()}`
        );
      case 'minLength':
        return this.createError(
          'VALIDATION_MIN_LENGTH',
          `${fieldName} is too short`,
          `Please enter at least the minimum required characters`
        );
      case 'maxLength':
        return this.createError(
          'VALIDATION_MAX_LENGTH',
          `${fieldName} is too long`,
          `Please reduce the length of ${field.toLowerCase()}`
        );
      case 'format':
        return this.createError(
          'VALIDATION_FORMAT',
          `${fieldName} format is invalid`,
          `Please enter a valid ${field.toLowerCase()}`
        );
      default:
        return this.createError(
          'VALIDATION_ERROR',
          `${fieldName} validation failed`,
          `Please check the ${field.toLowerCase()} and try again`
        );
    }
  }

  static handleAuthError(error: any): AppError {
    if (error?.message?.includes('Invalid login credentials')) {
      return this.createError(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid login credentials',
        'Please check your username and password and try again'
      );
    }

    if (error?.message?.includes('Email not confirmed')) {
      return this.createError(
        'AUTH_EMAIL_NOT_CONFIRMED',
        'Email not confirmed',
        'Please check your email and confirm your account'
      );
    }

    if (error?.message?.includes('Too many requests')) {
      return this.createError(
        'AUTH_RATE_LIMIT',
        'Too many login attempts',
        'Please wait a few minutes before trying again'
      );
    }

    return this.createError(
      'AUTH_ERROR',
      'Authentication failed',
      'Please try logging in again'
    );
  }

  static handleBusinessLogicError(operation: string, context?: string): AppError {
    switch (operation) {
      case 'CARD_ALREADY_ACTIVATED':
        return this.createError(
          'BUSINESS_CARD_ACTIVATED',
          'Card is already activated',
          'This card has already been activated by another clinic'
        );
      case 'PERK_ALREADY_REDEEMED':
        return this.createError(
          'BUSINESS_PERK_REDEEMED',
          'Perk has already been redeemed',
          'This perk was already claimed. Please try a different perk'
        );
      case 'INSUFFICIENT_PERMISSIONS':
        return this.createError(
          'BUSINESS_PERMISSIONS',
          'Insufficient permissions',
          'You do not have permission to perform this action'
        );
      case 'INVALID_CARD_STATUS':
        return this.createError(
          'BUSINESS_CARD_STATUS',
          'Invalid card status',
          'This action cannot be performed on cards with this status'
        );
      default:
        return this.createError(
          'BUSINESS_LOGIC_ERROR',
          `${operation} failed`,
          context || 'Please try again or contact support'
        );
    }
  }

  private static createError(
    code: string,
    message: string,
    userMessage?: string,
    action?: AppError['action']
  ): AppError {
    return {
      code,
      message,
      userMessage: userMessage || message,
      action,
    };
  }
}

// Global error boundary helper
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    console.error(`Error in ${context || 'operation'}:`, error);
    return { error: ErrorHandler.handleSupabaseError(error as Error) };
  }
};

// Retry mechanism for network failures
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (i === maxRetries - 1) {
        throw error;
      }

      // Only retry on network errors
      if (error instanceof Error && error.message.includes('fetch')) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else {
        throw error;
      }
    }
  }

  throw lastError!;
};