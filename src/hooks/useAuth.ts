import { useState, useEffect, useCallback } from 'react';

interface AuthUser {
  type: 'admin' | 'clinic';
  username?: string;
  clinicId?: string;
  clinicCode?: string;
  loginTime: number;
  lastActivity: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (type: 'admin' | 'clinic', userData: any) => void;
  logout: () => void;
  updateActivity: () => void;
}

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const STORAGE_KEY = 'mocards_auth_session';
const ACTIVITY_KEY = 'mocards_last_activity';

export const useAuth = (): AuthState => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(ACTIVITY_KEY, now.toString());

    if (user) {
      const updatedUser = { ...user, lastActivity: now };
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    }
  }, [user]);

  // Check if session is valid
  const isSessionValid = useCallback((userData: AuthUser): boolean => {
    const now = Date.now();
    const timeSinceActivity = now - userData.lastActivity;
    return timeSinceActivity < SESSION_TIMEOUT;
  }, []);

  // Login function
  const login = useCallback((type: 'admin' | 'clinic', userData: any) => {
    const now = Date.now();
    const authUser: AuthUser = {
      type,
      username: userData.username || userData.code,
      clinicId: userData.id,
      clinicCode: userData.code,
      loginTime: now,
      lastActivity: now
    };

    setUser(authUser);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    localStorage.setItem(ACTIVITY_KEY, now.toString());

    // Notify other tabs about the login
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { type: 'login', user: authUser }
    }));
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_KEY);

    // Notify other tabs about the logout
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { type: 'logout' }
    }));
  }, []);

  // Check session on mount and set up listeners
  useEffect(() => {
    // Check for existing session
    const checkExistingSession = () => {
      try {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          const userData: AuthUser = JSON.parse(savedUser);
          if (isSessionValid(userData)) {
            setUser(userData);
            setIsAuthenticated(true);
            updateActivity(); // Update activity on session restore
          } else {
            // Session expired
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(ACTIVITY_KEY);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ACTIVITY_KEY);
      }
    };

    checkExistingSession();

    // Listen for auth state changes from other tabs
    const handleAuthStateChange = (event: CustomEvent) => {
      const { type, user: userData } = event.detail;

      if (type === 'login' && userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else if (type === 'logout') {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    // Listen for storage changes (cross-tab synchronization)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        if (event.newValue) {
          try {
            const userData: AuthUser = JSON.parse(event.newValue);
            if (isSessionValid(userData)) {
              setUser(userData);
              setIsAuthenticated(true);
            }
          } catch (error) {
            console.error('Error parsing stored user data:', error);
          }
        } else {
          // Session was cleared
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    window.addEventListener('auth-state-change', handleAuthStateChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);  // Only run on mount

  // Set up inactivity timeout check
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkInactivity = () => {
      if (user && !isSessionValid(user)) {
        logout();
      }
    };

    // Check every minute for inactivity
    const inactivityInterval = setInterval(checkInactivity, 60 * 1000);

    return () => clearInterval(inactivityInterval);
  }, [isAuthenticated, user, isSessionValid, logout]);

  // Set up activity tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to avoid excessive localStorage writes
    let activityTimeout: NodeJS.Timeout;
    const throttledActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(handleActivity, 1000); // Update at most once per second
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledActivity, true);
    });

    return () => {
      clearTimeout(activityTimeout);
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledActivity, true);
      });
    };
  }, [isAuthenticated, updateActivity]);

  return {
    isAuthenticated,
    user,
    login,
    logout,
    updateActivity
  };
};