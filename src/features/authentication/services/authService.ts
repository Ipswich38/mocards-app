// Authentication Service
// Handles all authentication operations with enterprise security

import { supabase } from '../../../shared/services/supabase';
import { AuthResponse, LoginCredentials, RegisterData, UserProfile, AuthEventType } from '../types';
import { securityService } from './securityService';

class AuthenticationService {
  private currentUser: UserProfile | null = null;

  // Login with enhanced security
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Record login attempt
      await this.logSecurityEvent('login', {
        attempted_email: credentials.email || credentials.username
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email || credentials.username!,
        password: credentials.password,
      });

      if (error) {
        // Record failed login
        await this.logSecurityEvent('failed_login', {
          error: error.message,
          attempted_email: credentials.email || credentials.username
        });
        throw error;
      }

      // Get user profile
      const profile = await this.getUserProfile(data.user!.id);

      // Check if user is active and not locked
      if (!profile.is_active) {
        throw new Error('Account is deactivated');
      }

      if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
        throw new Error('Account is temporarily locked');
      }

      // Reset failed attempts and update last login
      await this.updateUserProfile(profile.id, {
        failed_login_attempts: 0,
        locked_until: undefined,
        last_login: new Date().toISOString()
      });

      // Create session record
      const session = await this.createSession(profile.id, data.session!);

      this.currentUser = profile;

      return {
        user: profile,
        session,
        success: true,
        message: 'Login successful'
      };

    } catch (error: any) {
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: error.message || 'Login failed'
      };
    }
  }

  // Clinic authentication (legacy support)
  async authenticateClinic(code: string, password: string): Promise<UserProfile | null> {
    try {
      const { data: clinic, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('code', code.toLowerCase())
        .single();

      if (error || !clinic) {
        await this.logSecurityEvent('failed_login', {
          attempted_clinic_code: code,
          error: 'Clinic not found'
        });
        return null;
      }

      // Verify password (in real app, this should be properly hashed)
      if (clinic.password !== password) {
        await this.logSecurityEvent('failed_login', {
          attempted_clinic_code: code,
          error: 'Invalid password'
        });
        return null;
      }

      // Create/get user profile for clinic
      const profile: UserProfile = {
        id: clinic.id,
        email: clinic.email,
        full_name: clinic.name,
        role: 'clinic',
        clinic_id: clinic.id,
        is_active: clinic.is_active || true,
        failed_login_attempts: 0,
        password_changed_at: new Date().toISOString(),
        metadata: { clinic_code: clinic.code },
        created_at: clinic.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.logSecurityEvent('login', { clinic_code: code });
      this.currentUser = profile;

      return profile;
    } catch (error) {
      console.error('Clinic authentication failed:', error);
      return null;
    }
  }

  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Create user profile
      const profile: Partial<UserProfile> = {
        id: authData.user!.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'user',
        clinic_id: data.clinic_id,
        is_active: true,
        failed_login_attempts: 0,
        metadata: {}
      };

      const { error: profileError } = await supabase
        .from('auth_mgmt.user_profiles')
        .insert([profile]);

      if (profileError) throw profileError;

      await this.logSecurityEvent('login', { new_user: true });

      return {
        user: profile as UserProfile,
        session: null as any,
        success: true,
        message: 'Registration successful'
      };

    } catch (error: any) {
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      if (this.currentUser) {
        await this.logSecurityEvent('logout', {});

        // Invalidate session
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }

      this.currentUser = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Get current user
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Private helper methods
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('auth_mgmt.user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  private async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase
      .from('auth_mgmt.user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  }

  private async createSession(userId: string, authSession: any): Promise<any> {
    const sessionData = {
      user_id: userId,
      session_token: authSession.access_token,
      expires_at: new Date(Date.now() + (authSession.expires_in * 1000)).toISOString(),
      is_active: true
    };

    const { data, error } = await supabase
      .from('auth_mgmt.user_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async logSecurityEvent(eventType: AuthEventType, details: Record<string, any>): Promise<void> {
    try {
      await securityService.logEvent({
        user_id: this.currentUser?.id,
        event_type: eventType,
        details,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.warn('Failed to log security event:', error);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, this would get the real IP from your backend
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Password change
  async changePassword(_currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update password changed timestamp
      if (this.currentUser) {
        await this.updateUserProfile(this.currentUser.id, {
          password_changed_at: new Date().toISOString()
        });

        await this.logSecurityEvent('password_change', {});
      }

      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      return false;
    }
  }

  // Account lockout management
  async handleFailedLogin(userId: string): Promise<void> {
    const profile = await this.getUserProfile(userId);
    const newAttempts = profile.failed_login_attempts + 1;

    let updates: Partial<UserProfile> = {
      failed_login_attempts: newAttempts
    };

    // Lock account after 5 failed attempts for 30 minutes
    if (newAttempts >= 5) {
      updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      await this.logSecurityEvent('account_locked', {
        attempts: newAttempts,
        locked_until: updates.locked_until
      });
    }

    await this.updateUserProfile(userId, updates);
  }
}

export const authService = new AuthenticationService();