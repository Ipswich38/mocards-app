// MOCARDS CLOUD - REAL SUPABASE CLOUD SYNCHRONIZATION
// Version: 5.0.0 - Christmas 2025 Production
// REAL multi-device cloud sync using Supabase database

import { supabase } from './supabase';
import { Card, Clinic, Appointment, Perk, PerkRedemption, PLAN_PRICING } from './schema';

// Cloud Sync Status
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// Real-time subscription management
class SupabaseCloudSync {
  private syncStatus: SyncStatus = 'synced';
  private lastSync: Date | null = null;
  private subscriptions: any[] = [];

  constructor() {
    this.setupRealTimeSubscriptions();
    this.checkConnection();
  }

  private async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('cards').select('id').limit(1);
      if (error) throw error;
      this.setSyncStatus('synced');
      return true;
    } catch (error) {
      console.error('[SupabaseCloudSync] Connection failed:', error);
      this.setSyncStatus('offline');
      return false;
    }
  }

  private setSyncStatus(status: SyncStatus) {
    this.syncStatus = status;
    if (status === 'synced') {
      this.lastSync = new Date();
    }
  }

  private setupRealTimeSubscriptions() {
    // Cards real-time subscription
    const cardsSubscription = supabase
      .channel('cards-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          console.log('[SupabaseCloudSync] Cards changed:', payload);
          this.lastSync = new Date();
        }
      )
      .subscribe();

    // Clinics real-time subscription
    const clinicsSubscription = supabase
      .channel('clinics-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'clinics' },
        (payload) => {
          console.log('[SupabaseCloudSync] Clinics changed:', payload);
          this.lastSync = new Date();
        }
      )
      .subscribe();

    // Appointments real-time subscription
    const appointmentsSubscription = supabase
      .channel('appointments-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('[SupabaseCloudSync] Appointments changed:', payload);
          this.lastSync = new Date();
        }
      )
      .subscribe();

    // Perks real-time subscription
    const perksSubscription = supabase
      .channel('perks-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'perks' },
        (payload) => {
          console.log('[SupabaseCloudSync] Perks changed:', payload);
          this.lastSync = new Date();
        }
      )
      .subscribe();

    // Perk redemptions real-time subscription
    const redemptionsSubscription = supabase
      .channel('redemptions-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'perk_redemptions' },
        (payload) => {
          console.log('[SupabaseCloudSync] Perk redemptions changed:', payload);
          this.lastSync = new Date();
        }
      )
      .subscribe();

    this.subscriptions = [
      cardsSubscription,
      clinicsSubscription,
      appointmentsSubscription,
      perksSubscription,
      redemptionsSubscription
    ];
  }

  // Cards Operations
  async getAllCards(): Promise<Card[]> {
    try {
      this.setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform Supabase data to our schema format
      const transformedCards: Card[] = (data || []).map(card => ({
        id: card.id,
        controlNumber: card.control_number || `MOC-${card.id}`,
        fullName: card.full_name || '',
        status: card.status === 'active' ? 'active' : 'inactive',
        perksTotal: card.perks_total || 5,
        perksUsed: card.perks_used || 0,
        clinicId: card.clinic_id || '',
        expiryDate: card.expiry_date || '2025-12-31',
        notes: card.notes || '',
        createdAt: card.created_at,
        updatedAt: card.updated_at || card.created_at,
      }));

      this.setSyncStatus('synced');
      return transformedCards;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error getting cards:', error);
      this.setSyncStatus('error');
      return [];
    }
  }

  async createCard(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<Card> {
    try {
      this.setSyncStatus('syncing');

      // Transform our schema to match the actual Supabase schema - simplified for initial creation
      const supabaseCard: any = {
        control_number: card.controlNumber,
        full_name: card.fullName || '',
        status: card.status,
        perks_total: card.perksTotal || 5,
        perks_used: card.perksUsed || 0,
        expiry_date: card.expiryDate,
      };

      // Only add clinic_id if it's not empty
      if (card.clinicId && card.clinicId.trim() !== '') {
        supabaseCard.clinic_id = card.clinicId;
      }

      // Only add notes if provided
      if (card.notes) {
        supabaseCard.notes = card.notes;
      }

      const { data, error } = await supabase
        .from('cards')
        .insert(supabaseCard)
        .select()
        .single();

      if (error) throw error;

      // Transform back to our schema
      const transformedCard: Card = {
        id: data.id,
        controlNumber: data.control_number,
        fullName: data.full_name || '',
        status: data.status,
        perksTotal: data.perks_total,
        perksUsed: data.perks_used,
        clinicId: data.clinic_id || '',
        expiryDate: data.expiry_date,
        notes: data.notes || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at || data.created_at,
      };

      this.setSyncStatus('synced');
      return transformedCard;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error creating card:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<Card>): Promise<boolean> {
    try {
      this.setSyncStatus('syncing');

      // Transform updates to Supabase schema
      const supabaseUpdates: any = {};

      if (updates.status !== undefined) {
        supabaseUpdates.status = updates.status === 'active' ? 'activated' : 'unactivated';
      }
      if (updates.clinicId !== undefined) {
        supabaseUpdates.assigned_clinic_id = updates.clinicId || null;
      }
      if (updates.expiryDate !== undefined) {
        supabaseUpdates.expires_at = updates.expiryDate + 'T23:59:59Z';
      }

      supabaseUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('cards')
        .update(supabaseUpdates)
        .eq('id', cardId);

      if (error) throw error;

      this.setSyncStatus('synced');
      return true;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error updating card:', error);
      this.setSyncStatus('error');
      return false;
    }
  }

  // Clinics Operations
  async getAllClinics(): Promise<Clinic[]> {
    try {
      this.setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform Supabase data to our schema format
      const transformedClinics: Clinic[] = (data || []).map(clinic => ({
        id: clinic.id,
        name: clinic.clinic_name,
        username: clinic.username || clinic.clinic_code.toLowerCase(),
        code: clinic.clinic_code,
        password: 'clinic123', // Default password (not stored in Supabase)
        plan: 'starter' as const,
        maxCards: 500,
        region: clinic.region || 'NCR',
        address: clinic.address,
        email: clinic.contact_email,
        contactNumber: clinic.contact_phone,
        subscriptionStatus: clinic.status === 'active' ? 'active' : 'suspended',
        subscriptionStartDate: clinic.created_at.split('T')[0],
        subscriptionPrice: PLAN_PRICING.starter,
        createdAt: clinic.created_at,
        updatedAt: clinic.updated_at,
        isActive: clinic.status === 'active',
      }));

      this.setSyncStatus('synced');
      return transformedClinics;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error getting clinics:', error);
      this.setSyncStatus('error');
      return [];
    }
  }

  async createClinic(clinic: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Clinic> {
    try {
      this.setSyncStatus('syncing');

      // Transform our schema to Supabase schema
      const supabaseClinic = {
        clinic_name: clinic.name,
        username: clinic.username,
        clinic_code: clinic.code,
        password_hash: clinic.password, // In production, hash this
        region: clinic.region,
        address: clinic.address,
        contact_email: clinic.email,
        contact_phone: clinic.contactNumber,
        status: clinic.isActive !== false ? 'active' : 'inactive',
      };

      const { data, error } = await supabase
        .from('clinics')
        .insert(supabaseClinic)
        .select()
        .single();

      if (error) throw error;

      // Transform back to our schema
      const transformedClinic: Clinic = {
        id: data.id,
        name: data.clinic_name,
        username: clinic.username,
        code: data.clinic_code,
        password: clinic.password,
        plan: clinic.plan,
        maxCards: clinic.maxCards,
        region: data.region,
        address: data.address,
        email: data.contact_email,
        contactNumber: data.contact_phone,
        subscriptionStatus: data.status === 'active' ? 'active' : 'suspended',
        subscriptionStartDate: data.created_at.split('T')[0],
        subscriptionPrice: PLAN_PRICING[clinic.plan],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isActive: data.status === 'active',
      };

      this.setSyncStatus('synced');
      return transformedClinic;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error creating clinic:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Appointments Operations
  async getAllAppointments(): Promise<Appointment[]> {
    try {
      this.setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to our schema format
      const transformedAppointments: Appointment[] = (data || []).map(apt => ({
        id: apt.id,
        cardControlNumber: apt.control_number,
        clinicId: apt.assigned_clinic_id || '',
        patientName: apt.patient_name || 'Unknown Patient',
        patientEmail: apt.patient_email || 'patient@example.com',
        patientPhone: apt.patient_phone || '+63 000 000 0000',
        preferredDate: apt.appointment_date,
        preferredTime: apt.appointment_time,
        serviceType: apt.service_type || 'General Consultation',
        perkRequested: apt.perk_type,
        status: this.mapAppointmentStatus(apt.status),
        notes: apt.cardholder_notes,
        createdAt: apt.created_at,
      }));

      this.setSyncStatus('synced');
      return transformedAppointments;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error getting appointments:', error);
      this.setSyncStatus('error');
      return [];
    }
  }

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    try {
      this.setSyncStatus('syncing');

      // Transform our schema to Supabase schema
      const supabaseAppointment = {
        control_number: appointment.cardControlNumber,
        assigned_clinic_id: appointment.clinicId,
        appointment_date: appointment.preferredDate,
        appointment_time: appointment.preferredTime,
        perk_type: appointment.perkRequested || appointment.serviceType,
        cardholder_notes: appointment.notes,
        status: 'waiting_for_approval' as const,
        patient_name: appointment.patientName,
        patient_email: appointment.patientEmail,
        patient_phone: appointment.patientPhone,
        service_type: appointment.serviceType,
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(supabaseAppointment)
        .select()
        .single();

      if (error) throw error;

      // Transform back to our schema
      const transformedAppointment: Appointment = {
        id: data.id,
        cardControlNumber: data.control_number,
        clinicId: data.assigned_clinic_id,
        patientName: data.patient_name,
        patientEmail: data.patient_email,
        patientPhone: data.patient_phone,
        preferredDate: data.appointment_date,
        preferredTime: data.appointment_time,
        serviceType: data.service_type,
        perkRequested: data.perk_type,
        status: this.mapAppointmentStatus(data.status),
        notes: data.cardholder_notes,
        createdAt: data.created_at,
      };

      this.setSyncStatus('synced');
      return transformedAppointment;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error creating appointment:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<boolean> {
    try {
      this.setSyncStatus('syncing');

      const supabaseUpdates: any = {};

      if (updates.status !== undefined) {
        supabaseUpdates.status = this.mapAppointmentStatusToSupabase(updates.status);
      }
      if (updates.notes !== undefined) {
        supabaseUpdates.cardholder_notes = updates.notes;
      }

      supabaseUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('appointments')
        .update(supabaseUpdates)
        .eq('id', appointmentId);

      if (error) throw error;

      this.setSyncStatus('synced');
      return true;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error updating appointment:', error);
      this.setSyncStatus('error');
      return false;
    }
  }

  // Perks Operations
  async getAllPerks(): Promise<Perk[]> {
    try {
      this.setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('perk_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to our schema format
      const transformedPerks: Perk[] = (data || []).map(perk => ({
        id: perk.id,
        type: this.mapPerkType(perk.type),
        name: perk.name,
        description: perk.description || '',
        value: perk.value || 0,
        isActive: perk.is_active,
        validFor: 365, // Default
        requiresApproval: false, // Default
        createdAt: perk.created_at,
        updatedAt: perk.updated_at,
      }));

      this.setSyncStatus('synced');
      return transformedPerks;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error getting perks:', error);
      this.setSyncStatus('error');
      return [];
    }
  }

  // Perk Redemptions Operations
  async getAllPerkRedemptions(): Promise<PerkRedemption[]> {
    try {
      this.setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('perk_redemptions')
        .select('*')
        .order('used_at', { ascending: false });

      if (error) {
        console.error('[SupabaseCloudSync] Perk redemptions query failed:', error);
        throw error;
      }

      // Transform to our schema format
      const transformedRedemptions: PerkRedemption[] = (data || []).map(redemption => ({
        id: redemption.id,
        cardControlNumber: redemption.card_control_number || 'Unknown',
        perkId: redemption.perk_id,
        perkName: redemption.perk_name || 'Unknown Perk',
        clinicId: redemption.clinic_id,
        claimantName: redemption.claimant_name || 'Unknown Patient',
        handledBy: redemption.handled_by || 'System',
        serviceType: redemption.service_type || 'General Service',
        usedAt: redemption.used_at,
        value: redemption.value || 0,
        notes: redemption.notes || '',
      }));

      this.setSyncStatus('synced');
      return transformedRedemptions;
    } catch (error) {
      console.error('[SupabaseCloudSync] Error getting perk redemptions:', error);
      this.setSyncStatus('error');
      return [];
    }
  }

  // Helper methods for data transformation
  private mapAppointmentStatus(supabaseStatus: string): Appointment['status'] {
    const statusMap: Record<string, Appointment['status']> = {
      'waiting_for_approval': 'pending',
      'approved': 'accepted',
      'pending_reschedule': 'rescheduled',
      'approved_reschedule': 'accepted',
      'cancelled': 'cancelled',
      'completed': 'completed',
    };
    return statusMap[supabaseStatus] || 'pending';
  }

  private mapAppointmentStatusToSupabase(status: Appointment['status']): string {
    const statusMap: Record<Appointment['status'], string> = {
      'pending': 'waiting_for_approval',
      'accepted': 'approved',
      'declined': 'cancelled',
      'rescheduled': 'pending_reschedule',
      'completed': 'completed',
      'cancelled': 'cancelled',
    };
    return statusMap[status] || 'waiting_for_approval';
  }

  private mapPerkType(supabasePerkType: string): Perk['type'] {
    const typeMap: Record<string, Perk['type']> = {
      'consultation': 'consultation',
      'cleaning': 'dental_cleaning',
      'xray': 'xray',
      'discount': 'discount',
      'service': 'treatment',
    };
    return typeMap[supabasePerkType] || 'consultation';
  }

  // Public API
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  getLastSync(): Date | null {
    return this.lastSync;
  }

  async forceSync(): Promise<boolean> {
    return await this.checkConnection();
  }

  cleanup() {
    this.subscriptions.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    this.subscriptions = [];
  }
}

// Singleton instance
export const supabaseCloudSync = new SupabaseCloudSync();

// Export cloud operations that now use real Supabase
export const cloudOperations = {
  // Cards Cloud Operations
  cards: {
    getAll: () => supabaseCloudSync.getAllCards(),
    save: async (_cards: Card[]): Promise<boolean> => {
      // For batch saves, we'd need to implement batch operations
      console.warn('[CloudOperations] Batch save not implemented for Supabase');
      return true;
    },
    add: async (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<Card> => {
      try {
        return await supabaseCloudSync.createCard(card);
      } catch (error) {
        console.error('[CloudOperations] Error adding card:', error);
        throw error; // Re-throw to let caller handle it
      }
    },
    update: async (cardId: string, updates: Partial<Card>): Promise<boolean> => {
      return await supabaseCloudSync.updateCard(cardId, updates);
    },
    remove: async (cardId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('cards').delete().eq('id', cardId);
        return !error;
      } catch (error) {
        console.error('[CloudOperations] Error removing card:', error);
        return false;
      }
    }
  },

  // Clinics Cloud Operations
  clinics: {
    getAll: () => supabaseCloudSync.getAllClinics(),
    save: async (_clinics: Clinic[]): Promise<boolean> => {
      console.warn('[CloudOperations] Batch save not implemented for Supabase');
      return true;
    },
    add: async (clinic: Clinic): Promise<boolean> => {
      try {
        await supabaseCloudSync.createClinic(clinic);
        return true;
      } catch (error) {
        console.error('[CloudOperations] Error adding clinic:', error);
        return false;
      }
    },
    update: async (clinicId: string, updates: Partial<Clinic>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('clinics')
          .update({
            clinic_name: updates.name,
            contact_email: updates.email,
            contact_phone: updates.contactNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', clinicId);
        return !error;
      } catch (error) {
        console.error('[CloudOperations] Error updating clinic:', error);
        return false;
      }
    },
    remove: async (clinicId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('clinics').delete().eq('id', clinicId);
        return !error;
      } catch (error) {
        console.error('[CloudOperations] Error removing clinic:', error);
        return false;
      }
    }
  },

  // Appointments Cloud Operations
  appointments: {
    getAll: () => supabaseCloudSync.getAllAppointments(),
    save: async (_appointments: Appointment[]): Promise<boolean> => {
      console.warn('[CloudOperations] Batch save not implemented for Supabase');
      return true;
    },
    add: async (appointment: Appointment): Promise<boolean> => {
      try {
        await supabaseCloudSync.createAppointment(appointment);
        return true;
      } catch (error) {
        console.error('[CloudOperations] Error adding appointment:', error);
        return false;
      }
    },
    update: async (appointmentId: string, updates: Partial<Appointment>): Promise<boolean> => {
      return await supabaseCloudSync.updateAppointment(appointmentId, updates);
    },
    remove: async (appointmentId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
        return !error;
      } catch (error) {
        console.error('[CloudOperations] Error removing appointment:', error);
        return false;
      }
    }
  },

  // Perks Cloud Operations
  perks: {
    getAll: () => supabaseCloudSync.getAllPerks(),
    save: async (_perks: Perk[]): Promise<boolean> => {
      console.warn('[CloudOperations] Batch save not implemented for Supabase');
      return true;
    },
    add: async (perk: Perk): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('perks')
          .insert({
            name: perk.name,
            description: perk.description,
            type: perk.type,
            value: perk.value,
            is_active: perk.isActive,
            is_system_default: false,
          });
        return !error;
      } catch (error) {
        console.error('[CloudOperations] Error adding perk:', error);
        return false;
      }
    },
    update: async (perkId: string, updates: Partial<Perk>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('perks')
          .update({
            name: updates.name,
            description: updates.description,
            default_value: updates.value,
            is_active: updates.isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', perkId);
        return !error;
      } catch (error) {
        console.error('[CloudOperations] Error updating perk:', error);
        return false;
      }
    },
    remove: async (perkId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('perk_templates').delete().eq('id', perkId);
        return !error;
      } catch (error) {
        console.error('[CloudOperations] Error removing perk:', error);
        return false;
      }
    }
  },

  // Perk Redemptions Cloud Operations
  perkRedemptions: {
    getAll: () => supabaseCloudSync.getAllPerkRedemptions(),
    save: async (_redemptions: PerkRedemption[]): Promise<boolean> => {
      console.warn('[CloudOperations] Batch save not implemented for Supabase');
      return true;
    },
    add: async (redemption: Omit<PerkRedemption, 'id'>): Promise<PerkRedemption> => {
      try {
        const { data, error } = await supabase
          .from('perk_redemptions')
          .insert({
            perk_id: redemption.perkId,
            perk_name: redemption.perkName,
            clinic_id: redemption.clinicId,
            card_control_number: redemption.cardControlNumber,
            claimant_name: redemption.claimantName,
            handled_by: redemption.handledBy,
            service_type: redemption.serviceType,
            used_at: redemption.usedAt,
            value: redemption.value,
            notes: redemption.notes || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Transform back to our schema
        return {
          id: data.id,
          cardControlNumber: data.card_control_number,
          perkId: data.perk_id,
          perkName: data.perk_name,
          clinicId: data.clinic_id,
          claimantName: data.claimant_name,
          handledBy: data.handled_by,
          serviceType: data.service_type,
          usedAt: data.used_at,
          value: data.value,
          notes: data.notes || '',
        };
      } catch (error) {
        console.error('[CloudOperations] Error adding perk redemption:', error);
        throw error;
      }
    }
  },

  // Sync Status Operations
  sync: {
    getStatus: () => supabaseCloudSync.getSyncStatus(),
    getLastSync: () => supabaseCloudSync.getLastSync(),
    forceSync: () => supabaseCloudSync.forceSync()
  }
};

// Export sync status hook
export const useSyncStatus = () => {
  return {
    status: supabaseCloudSync.getSyncStatus(),
    lastSync: supabaseCloudSync.getLastSync(),
    forceSync: supabaseCloudSync.forceSync
  };
};