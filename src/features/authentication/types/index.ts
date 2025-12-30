// Authentication Feature Types
// Centralized type definitions for the authentication module

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'super_admin' | 'admin' | 'clinic' | 'user';
  clinic_id?: string;
  is_active: boolean;
  last_login?: string;
  failed_login_attempts: number;
  locked_until?: string;
  password_changed_at: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  last_activity: string;
}

export interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'account_locked' | 'suspicious_activity';
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: UserSession | null;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role?: 'user' | 'clinic';
  clinic_id?: string;
}

export interface AuthResponse {
  user: UserProfile;
  session: UserSession;
  success: boolean;
  message?: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type AuthEventType = SecurityEvent['event_type'];