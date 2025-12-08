import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for the database schema
export interface Clinic {
  id: string;
  clinic_code: string;
  clinic_name: string;
  password_hash: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CardBatch {
  id: string;
  batch_number: string;
  total_cards: number;
  created_by: string;
  created_at: string;
}

export interface Card {
  id: string;
  batch_id: string;
  control_number: string;
  passcode: string;
  location_code: string;
  status: 'unactivated' | 'activated' | 'expired';
  assigned_clinic_id?: string;
  activated_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  clinic?: Clinic;
  perks?: CardPerk[];
}

export interface CardPerk {
  id: string;
  card_id: string;
  perk_type: string;
  claimed: boolean;
  claimed_at?: string;
  claimed_by_clinic?: string;
  created_at: string;
}

export interface CardTransaction {
  id: string;
  card_id: string;
  transaction_type: 'created' | 'assigned' | 'activated' | 'perk_claimed';
  performed_by: 'admin' | 'clinic';
  performed_by_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  card_id?: string;
  control_number: string;
  passcode: string;
  appointment_date: string;
  appointment_time: string;
  perk_type: string;
  cardholder_phone?: string;
  cardholder_email?: string;
  cardholder_notes?: string;
  assigned_clinic_id?: string;
  status: 'waiting_for_approval' | 'approved' | 'pending_reschedule' | 'approved_reschedule' | 'cancelled' | 'completed';
  booked_by_admin_id?: string;
  approved_by_clinic_id?: string;
  approved_at?: string;
  original_date?: string;
  original_time?: string;
  reschedule_reason?: string;
  reschedule_requested_at?: string;
  reschedule_approved_at?: string;
  clinic_contact_notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  clinic?: Clinic;
  card?: Card;
}

export interface AppointmentStatusHistory {
  id: string;
  appointment_id: string;
  old_status?: string;
  new_status: string;
  changed_by: 'admin' | 'clinic';
  changed_by_id?: string;
  reason?: string;
  created_at: string;
}

export interface AppointmentNotification {
  id: string;
  appointment_id: string;
  notification_type: 'booking_request' | 'approved' | 'reschedule_request' | 'cancelled';
  recipient_type: 'admin' | 'clinic' | 'cardholder';
  recipient_id?: string;
  message?: string;
  read_at?: string;
  created_at: string;
}

// Enhanced Perk Management Types
export interface PerkTemplate {
  id: string;
  name: string;
  description?: string;
  perk_type: string;
  default_value: number;
  category?: string;
  icon?: string;
  is_active: boolean;
  is_system_default: boolean;
  created_by_admin_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PerkCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ClinicPerkCustomization {
  id: string;
  clinic_id: string;
  perk_template_id: string;
  custom_name?: string;
  custom_description?: string;
  custom_value?: number;
  is_enabled: boolean;
  requires_appointment: boolean;
  max_redemptions_per_card: number;
  valid_from?: string;
  valid_until?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  perk_template?: PerkTemplate;
  clinic?: Clinic;
}

export interface PerkUsageAnalytics {
  id: string;
  perk_template_id: string;
  clinic_id: string;
  card_id: string;
  redemption_date: string;
  redemption_value: number;
  month_year: string;
  created_at: string;
}

// Utility functions for database operations
export const dbOperations = {
  // Card operations
  async createCardBatch(batchData: { batch_number: string; total_cards: number; created_by: string }) {
    const { data, error } = await supabase
      .from('card_batches')
      .insert(batchData)
      .select()
      .single();

    if (error) throw error;
    return data as CardBatch;
  },

  async createCard(cardData: Omit<Card, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single();

    if (error) throw error;
    return data as Card;
  },

  async getCardByControlNumber(controlNumber: string, passcode?: string) {
    let query = supabase
      .from('cards')
      .select(`
        *,
        clinic:mocards_clinics(*),
        perks:card_perks(*)
      `)
      .eq('control_number', controlNumber);

    if (passcode) {
      query = query.eq('passcode', passcode);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data as Card;
  },

  async activateCard(cardId: string, clinicId: string) {
    const { data, error } = await supabase
      .from('cards')
      .update({
        status: 'activated',
        assigned_clinic_id: clinicId,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) throw error;
    return data as Card;
  },

  async claimPerk(perkId: string, clinicId: string) {
    const { data, error } = await supabase
      .from('card_perks')
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by_clinic: clinicId
      })
      .eq('id', perkId)
      .eq('claimed', false) // Only allow claiming unclaimed perks
      .select()
      .single();

    if (error) throw error;
    return data as CardPerk;
  },

  // Clinic operations
  async createClinic(clinicData: Omit<Clinic, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('mocards_clinics')
      .insert({
        ...clinicData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  async getClinicByCode(clinicCode: string) {
    const { data, error } = await supabase
      .from('mocards_clinics')
      .select('*')
      .eq('clinic_code', clinicCode)
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  async getClinicCards(clinicId: string) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        perks:card_perks(*)
      `)
      .eq('assigned_clinic_id', clinicId);

    if (error) throw error;
    return data as Card[];
  },

  // Transaction logging for audit trail
  async logTransaction(transactionData: Omit<CardTransaction, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('card_transactions')
      .insert({
        ...transactionData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as CardTransaction;
  },

  // Admin operations
  async createAdminUser(userData: { username: string; password_hash: string; role?: string }) {
    const { data, error } = await supabase
      .from('mocards_admin_users')
      .insert({
        ...userData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as AdminUser;
  },

  async getAdminByUsername(username: string) {
    const { data, error } = await supabase
      .from('mocards_admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data as AdminUser;
  },

  // Appointment operations
  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async getAppointments(filters?: {
    status?: string;
    clinic_id?: string;
    admin_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        clinic:mocards_clinics(*),
        card:cards(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.clinic_id) {
      query = query.eq('assigned_clinic_id', filters.clinic_id);
    }
    if (filters?.admin_id) {
      query = query.eq('booked_by_admin_id', filters.admin_id);
    }
    if (filters?.date_from) {
      query = query.gte('appointment_date', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('appointment_date', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Appointment[];
  },

  async getAppointmentById(id: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clinic:mocards_clinics(*),
        card:cards(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async updateAppointmentStatus(
    appointmentId: string,
    newStatus: Appointment['status'],
    changedBy: 'admin' | 'clinic',
    changedById: string,
    reason?: string
  ) {
    const { data, error } = await supabase.rpc('update_appointment_status', {
      p_appointment_id: appointmentId,
      p_new_status: newStatus,
      p_changed_by: changedBy,
      p_changed_by_id: changedById,
      p_reason: reason
    });

    if (error) throw error;
    return data;
  },

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
    rescheduleReason: string,
    changedBy: 'admin' | 'clinic',
    changedById: string
  ) {
    const { data, error } = await supabase.rpc('reschedule_appointment', {
      p_appointment_id: appointmentId,
      p_new_date: newDate,
      p_new_time: newTime,
      p_reschedule_reason: rescheduleReason,
      p_changed_by: changedBy,
      p_changed_by_id: changedById
    });

    if (error) throw error;
    return data;
  },

  async getAppointmentHistory(appointmentId: string) {
    const { data, error } = await supabase
      .from('appointment_status_history')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as AppointmentStatusHistory[];
  },

  async createAppointmentNotification(notificationData: Omit<AppointmentNotification, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('appointment_notifications')
      .insert({
        ...notificationData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentNotification;
  },

  async getUnreadNotifications(recipientType: 'admin' | 'clinic' | 'cardholder', recipientId?: string) {
    let query = supabase
      .from('appointment_notifications')
      .select('*')
      .eq('recipient_type', recipientType)
      .is('read_at', null)
      .order('created_at', { ascending: false });

    if (recipientId) {
      query = query.eq('recipient_id', recipientId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AppointmentNotification[];
  },

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('appointment_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentNotification;
  },

  async getAllClinics() {
    const { data, error } = await supabase
      .from('mocards_clinics')
      .select('*')
      .eq('status', 'active')
      .order('clinic_name');

    if (error) throw error;
    return data as Clinic[];
  },

  // Perk Template Operations (Admin CRUD)
  async createPerkTemplate(templateData: Omit<PerkTemplate, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('perk_templates')
      .insert({
        ...templateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as PerkTemplate;
  },

  async getAllPerkTemplates() {
    const { data, error } = await supabase
      .from('perk_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data as PerkTemplate[];
  },

  async getActivePerkTemplates() {
    const { data, error } = await supabase
      .from('perk_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data as PerkTemplate[];
  },

  async getPerkTemplateById(id: string) {
    const { data, error } = await supabase
      .from('perk_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as PerkTemplate;
  },

  async updatePerkTemplate(id: string, updates: Partial<PerkTemplate>) {
    const { data, error } = await supabase
      .from('perk_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PerkTemplate;
  },

  async deletePerkTemplate(id: string) {
    // Check if it's a system default (cannot be deleted)
    const template = await this.getPerkTemplateById(id);
    if (template.is_system_default) {
      throw new Error('System default perks cannot be deleted');
    }

    const { data, error } = await supabase
      .from('perk_templates')
      .delete()
      .eq('id', id)
      .eq('is_system_default', false)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Perk Categories Operations
  async getAllPerkCategories() {
    const { data, error } = await supabase
      .from('perk_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data as PerkCategory[];
  },

  async createPerkCategory(categoryData: Omit<PerkCategory, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('perk_categories')
      .insert({
        ...categoryData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as PerkCategory;
  },

  async updatePerkCategory(id: string, updates: Partial<PerkCategory>) {
    const { data, error } = await supabase
      .from('perk_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PerkCategory;
  },

  // Clinic Perk Customization Operations
  async getClinicPerkCustomizations(clinicId: string) {
    const { data, error } = await supabase
      .from('clinic_perk_customizations')
      .select(`
        *,
        perk_template:perk_templates(*)
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClinicPerkCustomization[];
  },

  async getActiveClinicPerkCustomizations(clinicId: string) {
    const { data, error } = await supabase
      .from('clinic_perk_customizations')
      .select(`
        *,
        perk_template:perk_templates(*)
      `)
      .eq('clinic_id', clinicId)
      .eq('is_enabled', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClinicPerkCustomization[];
  },

  async updateClinicPerkCustomization(id: string, updates: Partial<ClinicPerkCustomization>) {
    const { data, error } = await supabase
      .from('clinic_perk_customizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ClinicPerkCustomization;
  },

  async createClinicPerkCustomization(customizationData: Omit<ClinicPerkCustomization, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('clinic_perk_customizations')
      .insert({
        ...customizationData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClinicPerkCustomization;
  },

  // Perk Usage Analytics
  async recordPerkUsage(usageData: Omit<PerkUsageAnalytics, 'id' | 'created_at' | 'month_year'>) {
    const redemptionDate = new Date(usageData.redemption_date);
    const monthYear = `${redemptionDate.getFullYear()}-${(redemptionDate.getMonth() + 1).toString().padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('perk_usage_analytics')
      .insert({
        ...usageData,
        month_year: monthYear,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as PerkUsageAnalytics;
  },

  async getClinicPerkAnalytics(clinicId: string, monthYear?: string) {
    let query = supabase
      .from('perk_usage_analytics')
      .select('*')
      .eq('clinic_id', clinicId);

    if (monthYear) {
      query = query.eq('month_year', monthYear);
    }

    const { data, error } = await query
      .order('redemption_date', { ascending: false });

    if (error) throw error;
    return data as PerkUsageAnalytics[];
  },

  async getPerkTemplateUsageStats(templateId: string, monthYear?: string) {
    let query = supabase
      .from('perk_usage_analytics')
      .select('*')
      .eq('perk_template_id', templateId);

    if (monthYear) {
      query = query.eq('month_year', monthYear);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as PerkUsageAnalytics[];
  }
};

// Card generation utilities
export const cardUtils = {
  generateBatchNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `MO-B${timestamp}${random}`;
  },

  generateControlNumber(batchNumber: string, cardIndex: number): string {
    const paddedIndex = cardIndex.toString().padStart(3, '0');
    return `${batchNumber.replace('B', 'C')}-${paddedIndex}`;
  },

  generatePasscode(): string {
    return Math.random().toString().slice(2, 8);
  },

  generateDefaultPerks(cardId: string): Omit<CardPerk, 'id' | 'created_at'>[] {
    const perkTypes = [
      'consultation',
      'cleaning',
      'extraction',
      'fluoride',
      'whitening',
      'xray',
      'denture',
      'braces'
    ];

    return perkTypes.map(type => ({
      card_id: cardId,
      perk_type: type,
      claimed: false
    }));
  }
};