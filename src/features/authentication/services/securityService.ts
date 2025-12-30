// Security Service
// Handles security events, monitoring, and threat detection

import { supabase } from '../../../shared/services/supabase';
import { SecurityEvent, AuthEventType } from '../types';

interface SecurityEventInput {
  user_id?: string;
  event_type: AuthEventType;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
}

class SecurityService {
  private suspiciousActivityThreshold = 10; // Maximum events per hour
  private monitoringEnabled = true;

  // Log security events
  async logEvent(event: SecurityEventInput): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      const { error } = await supabase
        .from('auth_mgmt.security_events')
        .insert([{
          user_id: event.user_id,
          event_type: event.event_type,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          details: event.details,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.warn('Failed to log security event:', error);
        return;
      }

      // Check for suspicious activity
      await this.detectSuspiciousActivity(event);

    } catch (error) {
      console.warn('Security event logging failed:', error);
    }
  }

  // Detect suspicious activity patterns
  private async detectSuspiciousActivity(event: SecurityEventInput): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check for multiple failed login attempts from same IP
      if (event.event_type === 'failed_login' && event.ip_address) {
        const { data: recentFailures, error } = await supabase
          .from('auth_mgmt.security_events')
          .select('*')
          .eq('event_type', 'failed_login')
          .eq('ip_address', event.ip_address)
          .gte('created_at', oneHourAgo);

        if (error) {
          console.warn('Failed to check suspicious activity:', error);
          return;
        }

        if (recentFailures && recentFailures.length >= this.suspiciousActivityThreshold) {
          await this.logEvent({
            user_id: event.user_id,
            event_type: 'suspicious_activity',
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            details: {
              reason: 'multiple_failed_logins',
              count: recentFailures.length,
              timeframe: '1_hour'
            }
          });

          // In production, you might want to:
          // - Block the IP address
          // - Send alerts to administrators
          // - Trigger additional security measures
        }
      }

      // Check for rapid successive login attempts
      if (event.user_id) {
        const { data: recentEvents, error } = await supabase
          .from('auth_mgmt.security_events')
          .select('*')
          .eq('user_id', event.user_id)
          .gte('created_at', oneHourAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Failed to check user activity:', error);
          return;
        }

        if (recentEvents && recentEvents.length >= this.suspiciousActivityThreshold) {
          await this.logEvent({
            user_id: event.user_id,
            event_type: 'suspicious_activity',
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            details: {
              reason: 'rapid_successive_attempts',
              count: recentEvents.length,
              timeframe: '1_hour'
            }
          });
        }
      }

    } catch (error) {
      console.warn('Suspicious activity detection failed:', error);
    }
  }

  // Get security events for a user (admin only)
  async getUserSecurityEvents(userId: string): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('auth_mgmt.security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  // Get security summary
  async getSecuritySummary(): Promise<{
    totalEvents: number;
    failedLogins: number;
    suspiciousActivity: number;
    recentEvents: SecurityEvent[];
  }> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get event counts
      const { data: events, error } = await supabase
        .from('auth_mgmt.security_events')
        .select('*')
        .gte('created_at', last24Hours)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalEvents = events?.length || 0;
      const failedLogins = events?.filter(e => e.event_type === 'failed_login').length || 0;
      const suspiciousActivity = events?.filter(e => e.event_type === 'suspicious_activity').length || 0;
      const recentEvents = events?.slice(0, 10) || [];

      return {
        totalEvents,
        failedLogins,
        suspiciousActivity,
        recentEvents
      };

    } catch (error) {
      console.error('Failed to get security summary:', error);
      return {
        totalEvents: 0,
        failedLogins: 0,
        suspiciousActivity: 0,
        recentEvents: []
      };
    }
  }

  // Validate session token
  async validateSession(token: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('auth_mgmt.user_sessions')
        .select('*')
        .eq('session_token', token)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return false;

      // Update last activity
      await supabase
        .from('auth_mgmt.user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', data.id);

      return true;

    } catch (error) {
      console.warn('Session validation failed:', error);
      return false;
    }
  }

  // Invalidate session
  async invalidateSession(token: string): Promise<void> {
    try {
      await supabase
        .from('auth_mgmt.user_sessions')
        .update({ is_active: false })
        .eq('session_token', token);

    } catch (error) {
      console.warn('Session invalidation failed:', error);
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await supabase
        .from('auth_mgmt.user_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString());

    } catch (error) {
      console.warn('Session cleanup failed:', error);
    }
  }

  // Enable/disable monitoring
  setMonitoring(enabled: boolean): void {
    this.monitoringEnabled = enabled;
  }

  // Configure thresholds
  setSuspiciousActivityThreshold(threshold: number): void {
    this.suspiciousActivityThreshold = threshold;
  }

  // IP geolocation for enhanced security (would integrate with external service)
  async getIPLocation(_ipAddress: string): Promise<{ country?: string; city?: string; suspicious?: boolean }> {
    // Placeholder for IP geolocation service
    // In production, integrate with services like MaxMind, IPinfo, etc.
    return {
      country: 'Unknown',
      city: 'Unknown',
      suspicious: false
    };
  }

  // Device fingerprinting (basic implementation)
  generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }

    return btoa(JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      timestamp: Date.now()
    }));
  }
}

export const securityService = new SecurityService();