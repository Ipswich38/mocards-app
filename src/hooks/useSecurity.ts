import { useState, useEffect, useCallback } from 'react';
import { SecurityManager } from '../lib/security';
import { useToast } from './useToast';
import { toastWarning, toastError, toastInfo } from '../lib/toast';

interface SecurityState {
  isBlocked: boolean;
  retryAfter?: number;
  attempts: number;
  lastAttempt?: Date;
}

export const useSecurity = () => {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isBlocked: false,
    attempts: 0,
  });
  const { addToast } = useToast();

  // Check if user is rate limited for a specific action
  const checkRateLimit = useCallback((action: string, identifier?: string) => {
    const id = identifier || getClientIdentifier();
    const result = SecurityManager.checkRateLimit(action, id);

    if (!result.allowed) {
      setSecurityState(prev => ({
        ...prev,
        isBlocked: true,
        retryAfter: result.retryAfter,
        attempts: prev.attempts + 1,
        lastAttempt: new Date(),
      }));

      addToast(toastWarning(
        'Rate Limit Exceeded',
        `Too many ${action} attempts. Please try again in ${result.retryAfter} seconds.`,
        {
          label: 'Understand',
          onClick: () => {}
        }
      ));

      return false;
    }

    return true;
  }, [addToast]);

  // Validate input for security threats
  const validateInput = useCallback((input: string, type: 'control_number' | 'general' = 'general') => {
    switch (type) {
      case 'control_number':
        return SecurityManager.validateControlNumber(input);
      default:
        const sanitized = SecurityManager.sanitizeInput(input);
        return {
          valid: sanitized === input,
          message: sanitized !== input ? 'Input contains invalid characters' : undefined,
          sanitized
        };
    }
  }, []);

  // Validate file uploads
  const validateFileUpload = useCallback((file: File) => {
    const result = SecurityManager.validateFileUpload(file);

    if (!result.valid) {
      addToast(toastError(
        'File Upload Error',
        result.message || 'Invalid file',
        {
          label: 'Try Again',
          onClick: () => {}
        }
      ));
    }

    return result;
  }, [addToast]);

  // Session management
  const createSecureSession = useCallback((userId: string, userType: 'admin' | 'clinic' | 'patient') => {
    const sessionToken = SecurityManager.createSession(userId, userType);

    addToast(toastInfo(
      'Secure Session Created',
      'Your session is encrypted and will auto-expire for security.',
      {
        label: 'Got it',
        onClick: () => {}
      }
    ));

    return sessionToken;
  }, [addToast]);

  const validateSession = useCallback((sessionToken: string) => {
    return SecurityManager.validateSession(sessionToken);
  }, []);

  const destroySession = useCallback((sessionToken: string) => {
    SecurityManager.destroySession(sessionToken);
    addToast(toastInfo('Session Ended', 'You have been securely logged out.'));
  }, [addToast]);

  // Password validation
  const validatePassword = useCallback((password: string) => {
    return SecurityManager.validatePassword(password);
  }, []);

  // Security monitoring
  const getSecurityMetrics = useCallback(() => {
    return SecurityManager.getSecurityMetrics();
  }, []);

  const getSecurityEvents = useCallback((severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    return SecurityManager.getSecurityEvents(severity);
  }, []);

  // Auto-unblock when rate limit window expires
  useEffect(() => {
    if (securityState.isBlocked && securityState.retryAfter) {
      const timeout = setTimeout(() => {
        setSecurityState(prev => ({
          ...prev,
          isBlocked: false,
          retryAfter: undefined,
        }));
        addToast(toastInfo('Access Restored', 'You can now try again.'));
      }, securityState.retryAfter * 1000);

      return () => clearTimeout(timeout);
    }
  }, [securityState.isBlocked, securityState.retryAfter, addToast]);

  return {
    // State
    securityState,

    // Rate limiting
    checkRateLimit,

    // Input validation
    validateInput,
    validateFileUpload,

    // Session management
    createSecureSession,
    validateSession,
    destroySession,

    // Password validation
    validatePassword,

    // Security monitoring
    getSecurityMetrics,
    getSecurityEvents,
  };
};

// Secure session management hook
export const useSecureSession = () => {
  const [session, setSession] = useState<{
    token?: string;
    userId?: string;
    userType?: string;
    isValid: boolean;
  }>({ isValid: false });

  const { validateSession, createSecureSession, destroySession } = useSecurity();

  const login = useCallback((userId: string, userType: 'admin' | 'clinic' | 'patient') => {
    const token = createSecureSession(userId, userType);
    setSession({
      token,
      userId,
      userType,
      isValid: true,
    });
    return token;
  }, [createSecureSession]);

  const logout = useCallback(() => {
    if (session.token) {
      destroySession(session.token);
    }
    setSession({ isValid: false });
  }, [session.token, destroySession]);

  const checkSession = useCallback(() => {
    if (!session.token) return false;

    const validation = validateSession(session.token);
    if (!validation.valid) {
      logout();
      return false;
    }

    return true;
  }, [session.token, validateSession, logout]);

  // Auto-validate session on mount and periodically
  useEffect(() => {
    checkSession();

    const interval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [checkSession]);

  return {
    session,
    login,
    logout,
    checkSession,
    isAuthenticated: session.isValid,
  };
};

// Utility function to get client identifier for rate limiting
function getClientIdentifier(): string {
  // In production, you might use:
  // - IP address (server-side)
  // - Browser fingerprint
  // - Device ID
  // - Combination of factors

  const stored = localStorage.getItem('mocards_client_id');
  if (stored) return stored;

  const clientId = generateClientId();
  localStorage.setItem('mocards_client_id', clientId);
  return clientId;
}

function generateClientId(): string {
  const factors = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.language,
  ].join('|');

  // Simple hash (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < factors.length; i++) {
    const char = factors.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36) + Date.now().toString(36);
}