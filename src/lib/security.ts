interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  sessionDuration: number; // in minutes
  passwordMinLength: number;
  requireTwoFactor: boolean;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'LOGIN_ATTEMPT' | 'FAILED_LOGIN' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT' | 'DATA_ACCESS';
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, any>;
}

export class SecurityManager {
  private static config: SecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    sessionDuration: 480, // 8 hours
    passwordMinLength: 8,
    requireTwoFactor: false,
  };

  private static rateLimits: Map<string, RateLimitConfig> = new Map([
    ['login', { windowMs: 15 * 60 * 1000, maxRequests: 5 }], // 5 attempts per 15 minutes
    ['search', { windowMs: 60 * 1000, maxRequests: 30 }], // 30 searches per minute
    ['api', { windowMs: 60 * 1000, maxRequests: 100 }], // 100 API calls per minute
    ['export', { windowMs: 60 * 60 * 1000, maxRequests: 10 }], // 10 exports per hour
  ]);

  private static attempts: Map<string, { count: number; lastAttempt: Date; blocked: boolean }> = new Map();
  private static events: SecurityEvent[] = [];

  // Input Sanitization
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remove potential XSS characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .slice(0, 1000); // Limit length
  }

  static validateControlNumber(controlNumber: string): { valid: boolean; message?: string } {
    const sanitized = this.sanitizeInput(controlNumber);

    if (!sanitized) {
      return { valid: false, message: 'Control number is required' };
    }

    // Check for SQL injection patterns
    const sqlPatterns = /(union|select|insert|update|delete|drop|exec|script)/i;
    if (sqlPatterns.test(sanitized)) {
      this.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        ip: 'unknown',
        userAgent: 'unknown',
        severity: 'HIGH',
        details: { input: sanitized, reason: 'SQL injection attempt' }
      });
      return { valid: false, message: 'Invalid characters detected' };
    }

    // Validate format
    if (!/^MOC-[\w\d-]+$/.test(sanitized)) {
      return { valid: false, message: 'Invalid control number format' };
    }

    if (sanitized.length > 50) {
      return { valid: false, message: 'Control number too long' };
    }

    return { valid: true };
  }

  // Rate Limiting
  static checkRateLimit(key: string, identifier: string): { allowed: boolean; retryAfter?: number } {
    const config = this.rateLimits.get(key);
    if (!config) return { allowed: true };

    const now = Date.now();
    const attemptKey = `${key}:${identifier}`;
    const attempts = this.attempts.get(attemptKey);

    if (!attempts) {
      this.attempts.set(attemptKey, {
        count: 1,
        lastAttempt: new Date(now),
        blocked: false
      });
      return { allowed: true };
    }

    // Reset if window has passed
    if (now - attempts.lastAttempt.getTime() > config.windowMs) {
      this.attempts.set(attemptKey, {
        count: 1,
        lastAttempt: new Date(now),
        blocked: false
      });
      return { allowed: true };
    }

    // Check if rate limit exceeded
    if (attempts.count >= config.maxRequests) {
      const retryAfter = Math.ceil((config.windowMs - (now - attempts.lastAttempt.getTime())) / 1000);

      this.logSecurityEvent({
        type: 'RATE_LIMIT',
        ip: identifier,
        userAgent: 'unknown',
        severity: 'MEDIUM',
        details: { key, attempts: attempts.count, limit: config.maxRequests }
      });

      return { allowed: false, retryAfter };
    }

    // Increment attempts
    attempts.count++;
    attempts.lastAttempt = new Date(now);

    return { allowed: true };
  }

  // Session Management
  static createSession(userId: string, userType: 'admin' | 'clinic' | 'patient'): string {
    const sessionData = {
      userId,
      userType,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionDuration * 60 * 1000),
      csrfToken: this.generateSecureToken(),
    };

    const sessionToken = this.generateSecureToken();

    // In a real app, store this in a secure session store
    localStorage.setItem(`mocards_session_${sessionToken}`, JSON.stringify(sessionData));

    this.logSecurityEvent({
      type: 'LOGIN_ATTEMPT',
      userId,
      ip: 'unknown',
      userAgent: navigator.userAgent,
      severity: 'LOW',
      details: { userType, sessionToken }
    });

    return sessionToken;
  }

  static validateSession(sessionToken: string): { valid: boolean; userId?: string; userType?: string } {
    try {
      const sessionData = localStorage.getItem(`mocards_session_${sessionToken}`);
      if (!sessionData) return { valid: false };

      const session = JSON.parse(sessionData);
      const now = new Date();

      if (now > new Date(session.expiresAt)) {
        this.destroySession(sessionToken);
        return { valid: false };
      }

      return {
        valid: true,
        userId: session.userId,
        userType: session.userType
      };
    } catch {
      return { valid: false };
    }
  }

  static destroySession(sessionToken: string): void {
    localStorage.removeItem(`mocards_session_${sessionToken}`);
  }

  // Password Security
  static validatePassword(password: string): { valid: boolean; message?: string; strength: number } {
    const sanitized = this.sanitizeInput(password);
    let strength = 0;

    if (sanitized.length < this.config.passwordMinLength) {
      return {
        valid: false,
        message: `Password must be at least ${this.config.passwordMinLength} characters`,
        strength: 0
      };
    }

    // Calculate strength
    if (sanitized.length >= 8) strength += 20;
    if (sanitized.length >= 12) strength += 10;
    if (/[a-z]/.test(sanitized)) strength += 20;
    if (/[A-Z]/.test(sanitized)) strength += 20;
    if (/[0-9]/.test(sanitized)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(sanitized)) strength += 15;

    const strengthLevel = strength >= 80 ? 'Strong' : strength >= 60 ? 'Good' : 'Weak';

    return {
      valid: strength >= 60,
      message: strength < 60 ? `Password is too weak (${strengthLevel})` : undefined,
      strength
    };
  }

  // Audit Logging
  static logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateSecureToken(),
      timestamp: new Date()
    };

    this.events.push(securityEvent);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Log critical events immediately
    if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
      console.warn('🔒 Security Alert:', securityEvent);
    }

    // In production, send to monitoring service
    this.sendToMonitoring(securityEvent);
  }

  static getSecurityEvents(severity?: SecurityEvent['severity']): SecurityEvent[] {
    if (severity) {
      return this.events.filter(event => event.severity === severity);
    }
    return this.events.slice(-100); // Return last 100 events
  }

  // Content Security
  static validateFileUpload(file: File): { valid: boolean; message?: string } {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        message: `File type '${file.type}' is not allowed`
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        message: 'File size exceeds 10MB limit'
      };
    }

    return { valid: true };
  }

  // Utility Functions
  private static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }

    return result;
  }

  private static sendToMonitoring(event: SecurityEvent): void {
    // In production, integrate with monitoring services like:
    // - Sentry for error tracking
    // - DataDog for security monitoring
    // - LogRocket for session replay
    // - Custom webhook endpoints for alerts

    if (typeof window !== 'undefined') {
      // Client-side monitoring integration would go here
      console.log('📊 Security Event:', event.type, event.severity);
    }
  }

  // Configuration
  static updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  static getConfig(): SecurityConfig {
    return { ...this.config };
  }

  static addRateLimit(key: string, config: RateLimitConfig): void {
    this.rateLimits.set(key, config);
  }

  // Security Dashboard Data
  static getSecurityMetrics(): {
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    recentThreats: SecurityEvent[];
    rateLimitViolations: number;
    activeBlocks: number;
  } {
    const eventsBySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };

    this.events.forEach(event => {
      eventsBySeverity[event.severity]++;
    });

    const rateLimitViolations = this.events.filter(e => e.type === 'RATE_LIMIT').length;
    const activeBlocks = Array.from(this.attempts.values()).filter(a => a.blocked).length;

    return {
      totalEvents: this.events.length,
      eventsBySeverity,
      recentThreats: this.events
        .filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
        .slice(-10),
      rateLimitViolations,
      activeBlocks
    };
  }
}