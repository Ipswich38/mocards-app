// Authentication Feature Module
// Public API exports for the authentication feature

// Types
export type {
  UserProfile,
  UserSession,
  SecurityEvent,
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthError,
  AuthEventType
} from './types';

// Services
export { authService } from './services/authService';
export { securityService } from './services/securityService';

// Hooks
export { useAuth, AuthProvider, useLegacyAuth } from './hooks/useAuth';

// Components (will be added when we create them)
// export { LoginForm, RegisterForm, SecurityDashboard } from './components';