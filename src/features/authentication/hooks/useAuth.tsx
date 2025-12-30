// Authentication Hook
// Centralized authentication state management with security features

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { authService } from '../services/authService';
import { securityService } from '../services/securityService';
import { AuthState, LoginCredentials, RegisterData } from '../types';

// Create auth context
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  loginClinic: (code: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook for authentication
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    session: null
  });

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.login(credentials);

      if (response.success) {
        setAuthState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          session: response.session
        });
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Clinic login (legacy support)
  const loginClinic = useCallback(async (code: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const user = await authService.authenticateClinic(code, password);

      if (user) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          session: null // Clinic auth doesn't use JWT sessions yet
        });
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('Clinic login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Register function
  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.register(data);

      if (response.success) {
        setAuthState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          session: response.session
        });
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        session: null
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      return await authService.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Password change error:', error);
      return false;
    }
  }, []);

  // Refresh authentication state
  const refreshAuth = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const currentUser = authService.getCurrentUser();
      const isAuthenticated = authService.isAuthenticated();

      setAuthState({
        user: currentUser,
        isAuthenticated,
        isLoading: false,
        session: null // Would fetch from service
      });
    } catch (error) {
      console.error('Auth refresh error:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        session: null
      });
    }
  }, []);

  // Permission checker
  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) return false;

    // Super admin has all permissions
    if (authState.user.role === 'super_admin') return true;

    // Define role-based permissions
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'manage_clinics',
        'view_analytics',
        'manage_cards',
        'manage_perks',
        'view_reports'
      ],
      clinic: [
        'manage_own_cards',
        'redeem_perks',
        'view_own_analytics',
        'manage_appointments'
      ],
      user: [
        'view_own_data'
      ]
    };

    const userPermissions = rolePermissions[authState.user.role] || [];
    return userPermissions.includes(permission);
  }, [authState.user]);

  // Role checker
  const isRole = useCallback((role: string): boolean => {
    return authState.user?.role === role;
  }, [authState.user]);

  // Initialize authentication state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        await refreshAuth();

        // Set up session monitoring
        if (authState.session?.session_token) {
          const interval = setInterval(async () => {
            const isValid = await securityService.validateSession(authState.session!.session_token);
            if (!isValid && mounted) {
              await logout();
            }
          }, 5 * 60 * 1000); // Check every 5 minutes

          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            session: null
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [refreshAuth, logout]);

  // Cleanup expired sessions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      securityService.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    loginClinic,
    register,
    logout,
    changePassword,
    refreshAuth,
    hasPermission,
    isRole
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Legacy hook for backward compatibility
export function useLegacyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ type: string; clinicId?: string } | null>(null);

  const login = (type: string, userData?: any) => {
    setIsAuthenticated(true);
    setUser({ type, ...userData });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    user,
    login,
    logout
  };
}