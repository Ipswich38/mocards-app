import { useState, useEffect, useCallback, useRef } from 'react';
import { dbOperations, SystemVersion } from '../lib/supabase';

interface UseRealtimeUpdatesOptions {
  components?: ('cards' | 'batches' | 'settings' | 'codes')[];
  onUpdate?: (component: string, newVersion: number, description?: string) => void;
  pollInterval?: number; // in milliseconds, default 30000 (30 seconds)
  autoRefresh?: boolean;
}

interface UpdateNotification {
  component: string;
  oldVersion: number;
  newVersion: number;
  description?: string;
  timestamp: Date;
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const {
    components = ['cards', 'batches', 'settings', 'codes'],
    onUpdate,
    pollInterval = 30000,
    autoRefresh = true
  } = options;

  const [currentVersions, setCurrentVersions] = useState<Record<string, SystemVersion>>({});
  const [notifications, setNotifications] = useState<UpdateNotification[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Initialize versions
  const initializeVersions = useCallback(async () => {
    try {
      const versions = await dbOperations.getSystemVersions();
      const versionMap: Record<string, SystemVersion> = {};

      for (const version of versions) {
        if (components.includes(version.component)) {
          versionMap[version.component] = version;
        }
      }

      if (mountedRef.current) {
        setCurrentVersions(versionMap);
        setLastCheck(new Date());
      }
    } catch (error) {
      console.warn('Failed to initialize system versions:', error);
    }
  }, [components]);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setIsPolling(true);
      const newVersions = await dbOperations.getSystemVersions();
      const updates: UpdateNotification[] = [];
      const updatedVersions = { ...currentVersions };

      for (const newVersion of newVersions) {
        if (!components.includes(newVersion.component)) continue;

        const currentVersion = currentVersions[newVersion.component];

        if (!currentVersion || currentVersion.version_number < newVersion.version_number) {
          updates.push({
            component: newVersion.component,
            oldVersion: currentVersion?.version_number || 0,
            newVersion: newVersion.version_number,
            description: newVersion.change_description,
            timestamp: new Date()
          });

          updatedVersions[newVersion.component] = newVersion;

          // Call update callback
          if (onUpdate) {
            onUpdate(newVersion.component, newVersion.version_number, newVersion.change_description);
          }
        }
      }

      if (mountedRef.current && updates.length > 0) {
        setCurrentVersions(updatedVersions);
        setNotifications(prev => [...updates, ...prev].slice(0, 50)); // Keep last 50 notifications
      }

      if (mountedRef.current) {
        setLastCheck(new Date());
      }
    } catch (error) {
      console.warn('Failed to check for updates:', error);
    } finally {
      if (mountedRef.current) {
        setIsPolling(false);
      }
    }
  }, [currentVersions, components, onUpdate]);

  // Start/stop polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(checkForUpdates, pollInterval);
  }, [checkForUpdates, pollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(() => {
    return checkForUpdates();
  }, [checkForUpdates]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Clear specific notification
  const clearNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Get version for specific component
  const getComponentVersion = useCallback((component: string) => {
    return currentVersions[component]?.version_number || 0;
  }, [currentVersions]);

  // Check if component has updates
  const hasUpdates = useCallback(() => {
    return notifications.length > 0;
  }, [notifications]);

  // Get latest notification for component
  const getLatestNotification = useCallback((component: string) => {
    return notifications.find(n => n.component === component);
  }, [notifications]);

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;
    initializeVersions();

    return () => {
      mountedRef.current = false;
    };
  }, [initializeVersions]);

  // Start polling if autoRefresh is enabled
  useEffect(() => {
    if (autoRefresh && Object.keys(currentVersions).length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [autoRefresh, currentVersions, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      mountedRef.current = false;
    };
  }, [stopPolling]);

  return {
    // State
    currentVersions,
    notifications,
    isPolling,
    lastCheck,

    // Actions
    refresh,
    startPolling,
    stopPolling,
    clearNotifications,
    clearNotification,

    // Utilities
    getComponentVersion,
    hasUpdates,
    getLatestNotification,

    // Stats
    updateCount: notifications.length
  };
}

// Hook for automatic form state preservation
export function useFormStatePreservation<T extends Record<string, any>>(
  userId: string,
  componentName: string,
  initialFormState: T,
  options: {
    saveInterval?: number; // Auto-save interval in ms
    enabled?: boolean;
  } = {}
) {
  const { saveInterval = 5000, enabled = true } = options;

  const [formState, setFormState] = useState<T>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved state on mount
  useEffect(() => {
    if (!enabled) return;

    const loadSavedState = async () => {
      try {
        const savedState = await dbOperations.getUserSessionState(userId, componentName);
        if (savedState && savedState.form_data) {
          setFormState({ ...initialFormState, ...savedState.form_data });
          setLastSaved(new Date(savedState.last_saved));
        }
      } catch (error) {
        console.warn('Failed to load saved form state:', error);
      }
    };

    loadSavedState();
  }, [userId, componentName, enabled]);

  // Save form state
  const saveFormState = useCallback(async (state?: T) => {
    if (!enabled) return;

    const stateToSave = state || formState;
    setIsSaving(true);
    setSaveError(null);

    try {
      await dbOperations.saveUserSessionState(
        userId,
        'admin',
        componentName,
        stateToSave,
        { lastModified: new Date().toISOString() }
      );
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save form state:', error);
      setSaveError('Failed to save form state');
    } finally {
      setIsSaving(false);
    }
  }, [userId, componentName, formState, enabled]);

  // Auto-save with debouncing
  const debouncedSave = useCallback((state: T) => {
    if (!enabled) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveFormState(state);
    }, saveInterval);
  }, [saveFormState, saveInterval, enabled]);

  // Update form state with auto-save
  const updateFormState = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setFormState(prev => {
      const newState = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  // Clear saved state
  const clearSavedState = useCallback(async () => {
    if (!enabled) return;

    try {
      // Use the proper dbOperations method instead of direct supabase access
      await dbOperations.clearExpiredSessions();
      setLastSaved(null);
    } catch (error) {
      console.error('Failed to clear saved state:', error);
    }
  }, [enabled]);

  // Manual save
  const forceSave = useCallback(() => {
    return saveFormState();
  }, [saveFormState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    formState,
    updateFormState,
    setFormState,

    // Save operations
    forceSave,
    clearSavedState,

    // State
    isSaving,
    lastSaved,
    saveError,

    // Utilities
    hasUnsavedChanges: lastSaved === null || JSON.stringify(formState) !== JSON.stringify(initialFormState)
  };
}

// Hook for dashboard notifications
export function useSystemNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    persistent?: boolean;
  }>>([]);

  const addNotification = useCallback((notification: Omit<typeof notifications[0], 'id' | 'timestamp'>) => {
    const newNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    count: notifications.length
  };
}