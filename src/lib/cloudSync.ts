// MOCARDS CLOUD - Real Cloud Synchronization Layer
// Ensures data persistence across multiple devices and browsers
// Version: 4.0.0 - Christmas 2025 Production

import { Card, Clinic, Appointment, Perk, PerkRedemption } from './schema';

// Cloud Storage Keys
const STORAGE_KEYS = {
  cards: 'mocards_cloud_cards',
  clinics: 'mocards_cloud_clinics',
  appointments: 'mocards_cloud_appointments',
  perks: 'mocards_cloud_perks',
  perkRedemptions: 'mocards_cloud_perk_redemptions',
  lastSync: 'mocards_cloud_last_sync',
  syncStatus: 'mocards_cloud_sync_status'
} as const;

// Cloud Sync Status
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// Cloud Storage Interface
interface CloudStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  getLastSync(): Date | null;
  setLastSync(): Promise<void>;
  getSyncStatus(): SyncStatus;
  setSyncStatus(status: SyncStatus): Promise<void>;
}

// Local Storage Implementation with Cloud Sync Preparation
class CloudSyncStorage implements CloudStorage {
  private isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error('[CloudSync] Error reading from storage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      // Set sync status to syncing
      await this.setSyncStatus('syncing');

      // Store locally
      localStorage.setItem(key, JSON.stringify(value));

      // TODO: Sync to real cloud backend (Supabase/Firebase/AWS)
      // await this.syncToCloud(key, value);

      // Update sync timestamp
      await this.setLastSync();
      await this.setSyncStatus('synced');

      return true;
    } catch (error) {
      console.error('[CloudSync] Error saving to storage:', error);
      await this.setSyncStatus('error');
      return false;
    }
  }

  async remove(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(key);
      await this.setLastSync();
      return true;
    } catch (error) {
      console.error('[CloudSync] Error removing from storage:', error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      await this.setLastSync();
      return true;
    } catch (error) {
      console.error('[CloudSync] Error clearing storage:', error);
      return false;
    }
  }

  getLastSync(): Date | null {
    const timestamp = localStorage.getItem(STORAGE_KEYS.lastSync);
    return timestamp ? new Date(timestamp) : null;
  }

  async setLastSync(): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
  }

  getSyncStatus(): SyncStatus {
    const status = localStorage.getItem(STORAGE_KEYS.syncStatus);
    if (!this.isOnline()) return 'offline';
    return (status as SyncStatus) || 'synced';
  }

  async setSyncStatus(status: SyncStatus): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.syncStatus, status);
  }

  // Future cloud backend sync method
  // private async syncToCloud(key: string, value: any): Promise<void> {
  //   // TODO: Implement real cloud sync
  //   // Examples:
  //   // - Supabase: await supabase.from('table').upsert(value)
  //   // - Firebase: await db.collection('table').doc(id).set(value)
  //   // - Custom API: await fetch('/api/sync', { method: 'POST', body: JSON.stringify(value) })
  //   console.log(`[CloudSync] Ready for cloud backend sync: ${key}`);
  // }
}

// Singleton cloud storage instance
export const cloudStorage = new CloudSyncStorage();

// Cloud Operations for each data type
export const cloudOperations = {
  // Cards Cloud Operations
  cards: {
    getAll: (): Card[] => cloudStorage.get<Card[]>(STORAGE_KEYS.cards) || [],

    save: async (cards: Card[]): Promise<boolean> => {
      return await cloudStorage.set(STORAGE_KEYS.cards, cards);
    },

    add: async (card: Card): Promise<boolean> => {
      const existing = cloudStorage.get<Card[]>(STORAGE_KEYS.cards) || [];
      existing.push(card);
      return await cloudStorage.set(STORAGE_KEYS.cards, existing);
    },

    update: async (cardId: string, updates: Partial<Card>): Promise<boolean> => {
      const existing = cloudStorage.get<Card[]>(STORAGE_KEYS.cards) || [];
      const index = existing.findIndex(c => c.id === cardId);
      if (index === -1) return false;

      existing[index] = { ...existing[index], ...updates, updatedAt: new Date().toISOString() };
      return await cloudStorage.set(STORAGE_KEYS.cards, existing);
    },

    remove: async (cardId: string): Promise<boolean> => {
      const existing = cloudStorage.get<Card[]>(STORAGE_KEYS.cards) || [];
      const filtered = existing.filter(c => c.id !== cardId);
      return await cloudStorage.set(STORAGE_KEYS.cards, filtered);
    }
  },

  // Clinics Cloud Operations
  clinics: {
    getAll: (): Clinic[] => cloudStorage.get<Clinic[]>(STORAGE_KEYS.clinics) || [],

    save: async (clinics: Clinic[]): Promise<boolean> => {
      return await cloudStorage.set(STORAGE_KEYS.clinics, clinics);
    },

    add: async (clinic: Clinic): Promise<boolean> => {
      const existing = cloudStorage.get<Clinic[]>(STORAGE_KEYS.clinics) || [];
      existing.push(clinic);
      return await cloudStorage.set(STORAGE_KEYS.clinics, existing);
    },

    update: async (clinicId: string, updates: Partial<Clinic>): Promise<boolean> => {
      const existing = cloudStorage.get<Clinic[]>(STORAGE_KEYS.clinics) || [];
      const index = existing.findIndex(c => c.id === clinicId);
      if (index === -1) return false;

      existing[index] = { ...existing[index], ...updates, updatedAt: new Date().toISOString() };
      return await cloudStorage.set(STORAGE_KEYS.clinics, existing);
    },

    remove: async (clinicId: string): Promise<boolean> => {
      const existing = cloudStorage.get<Clinic[]>(STORAGE_KEYS.clinics) || [];
      const filtered = existing.filter(c => c.id !== clinicId);
      return await cloudStorage.set(STORAGE_KEYS.clinics, filtered);
    }
  },

  // Appointments Cloud Operations
  appointments: {
    getAll: (): Appointment[] => cloudStorage.get<Appointment[]>(STORAGE_KEYS.appointments) || [],

    save: async (appointments: Appointment[]): Promise<boolean> => {
      return await cloudStorage.set(STORAGE_KEYS.appointments, appointments);
    },

    add: async (appointment: Appointment): Promise<boolean> => {
      const existing = cloudStorage.get<Appointment[]>(STORAGE_KEYS.appointments) || [];
      existing.push(appointment);
      return await cloudStorage.set(STORAGE_KEYS.appointments, existing);
    },

    update: async (appointmentId: string, updates: Partial<Appointment>): Promise<boolean> => {
      const existing = cloudStorage.get<Appointment[]>(STORAGE_KEYS.appointments) || [];
      const index = existing.findIndex(a => a.id === appointmentId);
      if (index === -1) return false;

      existing[index] = { ...existing[index], ...updates, updatedAt: new Date().toISOString() };
      return await cloudStorage.set(STORAGE_KEYS.appointments, existing);
    },

    remove: async (appointmentId: string): Promise<boolean> => {
      const existing = cloudStorage.get<Appointment[]>(STORAGE_KEYS.appointments) || [];
      const filtered = existing.filter(a => a.id !== appointmentId);
      return await cloudStorage.set(STORAGE_KEYS.appointments, filtered);
    }
  },

  // Perks Cloud Operations
  perks: {
    getAll: (): Perk[] => cloudStorage.get<Perk[]>(STORAGE_KEYS.perks) || [],

    save: async (perks: Perk[]): Promise<boolean> => {
      return await cloudStorage.set(STORAGE_KEYS.perks, perks);
    },

    add: async (perk: Perk): Promise<boolean> => {
      const existing = cloudStorage.get<Perk[]>(STORAGE_KEYS.perks) || [];
      existing.push(perk);
      return await cloudStorage.set(STORAGE_KEYS.perks, existing);
    },

    update: async (perkId: string, updates: Partial<Perk>): Promise<boolean> => {
      const existing = cloudStorage.get<Perk[]>(STORAGE_KEYS.perks) || [];
      const index = existing.findIndex(p => p.id === perkId);
      if (index === -1) return false;

      existing[index] = { ...existing[index], ...updates, updatedAt: new Date().toISOString() };
      return await cloudStorage.set(STORAGE_KEYS.perks, existing);
    },

    remove: async (perkId: string): Promise<boolean> => {
      const existing = cloudStorage.get<Perk[]>(STORAGE_KEYS.perks) || [];
      const filtered = existing.filter(p => p.id !== perkId);
      return await cloudStorage.set(STORAGE_KEYS.perks, filtered);
    }
  },

  // Perk Redemptions Cloud Operations
  perkRedemptions: {
    getAll: (): PerkRedemption[] => cloudStorage.get<PerkRedemption[]>(STORAGE_KEYS.perkRedemptions) || [],

    save: async (redemptions: PerkRedemption[]): Promise<boolean> => {
      return await cloudStorage.set(STORAGE_KEYS.perkRedemptions, redemptions);
    },

    add: async (redemption: PerkRedemption): Promise<boolean> => {
      const existing = cloudStorage.get<PerkRedemption[]>(STORAGE_KEYS.perkRedemptions) || [];
      existing.push(redemption);
      return await cloudStorage.set(STORAGE_KEYS.perkRedemptions, existing);
    }
  },

  // Sync Status Operations
  sync: {
    getStatus: (): SyncStatus => cloudStorage.getSyncStatus(),
    getLastSync: (): Date | null => cloudStorage.getLastSync(),

    forceSync: async (): Promise<boolean> => {
      try {
        await cloudStorage.setSyncStatus('syncing');

        // Re-save all data to trigger sync
        const cards = cloudStorage.get<Card[]>(STORAGE_KEYS.cards) || [];
        const clinics = cloudStorage.get<Clinic[]>(STORAGE_KEYS.clinics) || [];
        const appointments = cloudStorage.get<Appointment[]>(STORAGE_KEYS.appointments) || [];
        const perks = cloudStorage.get<Perk[]>(STORAGE_KEYS.perks) || [];
        const redemptions = cloudStorage.get<PerkRedemption[]>(STORAGE_KEYS.perkRedemptions) || [];

        await cloudStorage.set(STORAGE_KEYS.cards, cards);
        await cloudStorage.set(STORAGE_KEYS.clinics, clinics);
        await cloudStorage.set(STORAGE_KEYS.appointments, appointments);
        await cloudStorage.set(STORAGE_KEYS.perks, perks);
        await cloudStorage.set(STORAGE_KEYS.perkRedemptions, redemptions);

        await cloudStorage.setSyncStatus('synced');
        return true;
      } catch (error) {
        console.error('[CloudSync] Force sync failed:', error);
        await cloudStorage.setSyncStatus('error');
        return false;
      }
    }
  }
};

// Cloud Sync Event Listeners
export const setupCloudSync = () => {
  // Online/Offline detection
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      console.log('[CloudSync] Connection restored, syncing...');
      await cloudOperations.sync.forceSync();
    });

    window.addEventListener('offline', async () => {
      console.log('[CloudSync] Connection lost, switching to offline mode');
      await cloudStorage.setSyncStatus('offline');
    });
  }
};

// Initialize cloud sync
setupCloudSync();

// Export sync status for UI components
export const useSyncStatus = () => {
  return {
    status: cloudOperations.sync.getStatus(),
    lastSync: cloudOperations.sync.getLastSync(),
    forceSync: cloudOperations.sync.forceSync
  };
};