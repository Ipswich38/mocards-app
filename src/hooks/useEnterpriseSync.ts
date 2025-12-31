/**
 * Enterprise Synchronization Hook
 * Real-time data synchronization across all admin portal features
 * @version 1.0.0
 */

import { useCallback, useRef, useEffect } from 'react';
import { useToast } from './useToast';

interface SyncEvent {
  type: 'card_generated' | 'clinic_created' | 'clinic_updated' | 'card_updated' | 'data_changed';
  source: string;
  timestamp: number;
  data?: any;
}

type SyncCallback = () => Promise<void> | void;

export function useEnterpriseSync() {
  const syncCallbacksRef = useRef<Map<string, SyncCallback>>(new Map());
  const lastSyncRef = useRef<number>(Date.now());
  const { addToast } = useToast();

  // Register a sync callback
  const registerSyncCallback = useCallback((key: string, callback: SyncCallback) => {
    syncCallbacksRef.current.set(key, callback);

    return () => {
      syncCallbacksRef.current.delete(key);
    };
  }, []);

  // Trigger sync across all registered callbacks
  const triggerSync = useCallback(async (event: SyncEvent) => {
    const now = Date.now();

    // Debounce rapid sync calls (max 1 per second)
    if (now - lastSyncRef.current < 1000) {
      return;
    }

    lastSyncRef.current = now;

    console.log('🔄 Enterprise sync triggered:', event);

    const callbacks = Array.from(syncCallbacksRef.current.values());

    try {
      // Execute all sync callbacks in parallel
      await Promise.all(
        callbacks.map(callback => Promise.resolve(callback()))
      );

      console.log('✅ Enterprise sync completed successfully');

      // Show sync notification for significant events
      if (event.type === 'card_generated' || event.type === 'clinic_created') {
        addToast({
          type: 'success',
          title: 'Data Synchronized',
          message: `${getSyncEventMessage(event.type)} - All features updated`,
          duration: 3000
        });
      }

    } catch (error) {
      console.error('❌ Enterprise sync failed:', error);
      addToast({
        type: 'error',
        title: 'Sync Error',
        message: 'Failed to synchronize data across features',
        duration: 5000
      });
    }
  }, [addToast]);

  // Simplified sync methods for common operations
  const syncAfterCardGeneration = useCallback(async (cardCount?: number) => {
    await triggerSync({
      type: 'card_generated',
      source: 'card_generator',
      timestamp: Date.now(),
      data: { cardCount }
    });
  }, [triggerSync]);

  const syncAfterClinicOperation = useCallback(async (operation: 'created' | 'updated', clinicName?: string) => {
    await triggerSync({
      type: operation === 'created' ? 'clinic_created' : 'clinic_updated',
      source: 'clinic_management',
      timestamp: Date.now(),
      data: { clinicName }
    });
  }, [triggerSync]);

  const syncAfterDataChange = useCallback(async (source: string) => {
    await triggerSync({
      type: 'data_changed',
      source,
      timestamp: Date.now()
    });
  }, [triggerSync]);

  // Auto-sync on window focus for fresh data
  useEffect(() => {
    const handleFocus = () => {
      triggerSync({
        type: 'data_changed',
        source: 'window_focus',
        timestamp: Date.now()
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [triggerSync]);

  // Broadcast sync events across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mocards_sync_event' && e.newValue) {
        try {
          const event: SyncEvent = JSON.parse(e.newValue);
          // Don't sync our own events to avoid loops
          if (event.timestamp !== lastSyncRef.current) {
            triggerSync(event);
          }
        } catch (error) {
          console.error('Failed to parse sync event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [triggerSync]);

  // Broadcast sync event to other tabs
  const broadcastSync = useCallback((event: SyncEvent) => {
    try {
      localStorage.setItem('mocards_sync_event', JSON.stringify(event));
      // Clear after a moment to allow other tabs to read it
      setTimeout(() => {
        localStorage.removeItem('mocards_sync_event');
      }, 100);
    } catch (error) {
      console.error('Failed to broadcast sync event:', error);
    }
  }, []);

  // Enhanced sync methods that broadcast to other tabs
  const syncAfterCardGenerationBroadcast = useCallback(async (cardCount?: number) => {
    const event: SyncEvent = {
      type: 'card_generated',
      source: 'card_generator',
      timestamp: Date.now(),
      data: { cardCount }
    };

    broadcastSync(event);
    await triggerSync(event);
  }, [broadcastSync, triggerSync]);

  const syncAfterClinicOperationBroadcast = useCallback(async (operation: 'created' | 'updated', clinicName?: string) => {
    const event: SyncEvent = {
      type: operation === 'created' ? 'clinic_created' : 'clinic_updated',
      source: 'clinic_management',
      timestamp: Date.now(),
      data: { clinicName }
    };

    broadcastSync(event);
    await triggerSync(event);
  }, [broadcastSync, triggerSync]);

  return {
    registerSyncCallback,
    triggerSync,
    syncAfterCardGeneration,
    syncAfterClinicOperation,
    syncAfterDataChange,
    syncAfterCardGenerationBroadcast,
    syncAfterClinicOperationBroadcast,
  };
}

function getSyncEventMessage(eventType: SyncEvent['type']): string {
  switch (eventType) {
    case 'card_generated':
      return 'Cards generated';
    case 'clinic_created':
      return 'Clinic created';
    case 'clinic_updated':
      return 'Clinic updated';
    case 'card_updated':
      return 'Card updated';
    default:
      return 'Data updated';
  }
}

export default useEnterpriseSync;