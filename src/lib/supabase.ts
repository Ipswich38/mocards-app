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
  password_must_be_changed?: boolean;
  first_login?: boolean;
  last_password_change?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  region?: string;
  location_code?: string;
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
  batch_id?: string;
  control_number: string;
  control_number_v2?: string; // Legacy format: MOC-XXXXX
  unified_control_number?: string; // New unified format: MOC-10000-XX-XXXXXX
  display_card_number?: number; // Display number in 10000-19999 range
  passcode?: string;
  location_code?: string;
  location_code_v2?: string; // Region format: 01-16
  clinic_code_v2?: string; // Clinic code format: CVT001
  card_number?: number; // Internal sequence 1-10000
  is_activated?: boolean;
  status: 'unassigned' | 'assigned' | 'activated' | 'expired' | 'suspended' | 'unactivated';
  assigned_clinic_id?: string;
  activated_by_clinic_id?: string;
  activated_at?: string;
  expires_at?: string;
  migration_version?: number;
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
export interface Perkdatalate {
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
  perk_datalate_id: string;
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
  perk_datalate?: Perkdatalate;
  clinic?: Clinic;
}

export interface PerkUsageAnalytics {
  id: string;
  perk_datalate_id: string;
  clinic_id: string;
  card_id: string;
  redemption_date: string;
  redemption_value: number;
  month_year: string;
  created_at: string;
}

// Enhanced Card Management Types
export interface CodeGenerationSettings {
  id: string;
  setting_type: 'batch' | 'control' | 'passcode' | 'location';
  generation_mode: 'auto' | 'manual' | 'range';
  pattern_datalate?: string;
  location_prefix?: string;
  auto_range_start?: number;
  auto_range_end?: number;
  current_sequence: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationCode {
  id: string;
  code: string;
  location_name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CardCodeHistory {
  id: string;
  card_id: string;
  change_type: 'created' | 'control_updated' | 'passcode_updated' | 'batch_updated';
  old_value?: string;
  new_value?: string;
  field_name?: string;
  changed_by?: string;
  change_reason?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SystemVersion {
  id: string;
  component: 'cards' | 'batches' | 'settings' | 'codes';
  version_number: number;
  change_description?: string;
  changed_by?: string;
  created_at: string;
}

export interface UserSessionState {
  id: string;
  user_id?: string;
  user_type: 'admin' | 'clinic' | 'cardholder';
  component_name: string;
  form_data: Record<string, any>;
  draft_state: Record<string, any>;
  last_saved: string;
  expires_at: string;
}

// New MOC System V2 Interfaces
export interface LocationCodeV2 {
  id: string;
  code: string; // 01-16
  region_name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ClinicCodeByRegion {
  id: string;
  clinic_code: string; // 4-digit code
  region_type: 'visayas' | 'luzon_4a' | 'ncr';
  region_name: string;
  location_code: string; // References location code (01-16)
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DefaultPerkdatalate {
  id: string;
  perk_name: string;
  perk_type: 'discount' | 'cashback' | 'service' | 'consultation' | 'cleaning' | 'xray' | 'extraction' | 'filling' | 'freebie' | 'points';
  perk_value: number;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  customizable?: boolean;
  max_redemptions?: number;
  valid_for_days?: number;
  created_at: string;
  updated_at: string;
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
    // Universal card search supporting all formats:
    // - Legacy: MOC-00001, MOC-10000
    // - V2: MOC-00001
    // - Unified: MOC-10000-01-CVT001
    // - Card numbers: 1, 10000
    // - Display numbers: 10000, 19999
    // - 5-digit: 00001, 10000

    const fiveDigitPattern = /^\d{5}$/;
    const simpleNumberPattern = /^\d{1,5}$/;
    const isFiveDigitSearch = fiveDigitPattern.test(controlNumber);
    const isSimpleNumber = simpleNumberPattern.test(controlNumber);

    let query = supabase
      .from('cards')
      .select(`
        *,
        clinic:mocards_clinics(*),
        perks:card_perks(*)
      `);

    if (isFiveDigitSearch || isSimpleNumber) {
      // Search by multiple formats for numbers
      const searchNum = parseInt(controlNumber.replace(/^0+/, '') || '0');
      const paddedNum = controlNumber.padStart(5, '0');

      query = query.or(
        `control_number.like.%${paddedNum},` +
        `control_number_v2.like.%${paddedNum},` +
        `unified_control_number.like.%${paddedNum},` +
        `card_number.eq.${searchNum},` +
        `display_card_number.eq.${searchNum + 9999}`
      );
    } else {
      // Search by full control number (all formats)
      query = query.or(
        `control_number.eq.${controlNumber},` +
        `control_number_v2.eq.${controlNumber},` +
        `unified_control_number.eq.${controlNumber}`
      );
    }

    // Restrict to our 10k card range
    query = query.gte('card_number', 1).lte('card_number', 10000);

    if (passcode) {
      query = query.eq('passcode', passcode);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data as Card;
  },

  // New universal search function for multiple results
  async searchCards(searchTerm: string, limit: number = 10) {
    const { data, error } = await supabase
      .rpc('search_card_universal', { search_term: searchTerm })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Get the primary control number for display (unified > v2 > legacy)
  getPrimaryControlNumber(card: Card): string {
    return card.unified_control_number || card.control_number_v2 || card.control_number || `Card #${card.card_number}`;
  },

  // Get the display card number (new 10000+ range)
  getDisplayCardNumber(card: Card): number {
    return card.display_card_number || ((card.card_number || 0) + 9999);
  },

  async activateCard(cardId: string, clinicId: string, regionCode: string = '16') {
    // Get clinic info for assignment tracking
    const { data: clinic } = await supabase
      .from('mocards_clinics')
      .select('clinic_code')
      .eq('id', clinicId)
      .single();

    const clinicCode = clinic?.clinic_code || null;

    // Update card with activation data - keep original control number
    const { data, error } = await supabase
      .from('cards')
      .update({
        is_activated: true,
        status: 'activated',
        assigned_clinic_id: clinicId,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        location_code_v2: regionCode,
        clinic_code_v2: clinicCode,
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

  // Perk datalate Operations (Admin CRUD)
  async createPerkdatalate(datalateData: Omit<Perkdatalate, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('perk_datalates')
      .insert({
        ...datalateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as Perkdatalate;
  },

  async getAllPerkdatalates() {
    const { data, error } = await supabase
      .from('perk_datalates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Perkdatalate[];
  },

  async getActivePerkdatalates() {
    const { data, error } = await supabase
      .from('perk_datalates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Perkdatalate[];
  },

  async getPerkdatalateById(id: string) {
    const { data, error } = await supabase
      .from('perk_datalates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Perkdatalate;
  },

  async updatePerkdatalate(id: string, updates: Partial<Perkdatalate>) {
    const { data, error } = await supabase
      .from('perk_datalates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Perkdatalate;
  },

  async deletePerkdatalate(id: string) {
    // Check if it's a system default (cannot be deleted)
    const datalate = await this.getPerkdatalateById(id);
    if (datalate.is_system_default) {
      throw new Error('System default perks cannot be deleted');
    }

    const { data, error } = await supabase
      .from('perk_datalates')
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
        perk_datalate:perk_datalates(*)
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
        perk_datalate:perk_datalates(*)
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

  async getPerkdatalateUsageStats(datalateId: string, monthYear?: string) {
    let query = supabase
      .from('perk_usage_analytics')
      .select('*')
      .eq('perk_datalate_id', datalateId);

    if (monthYear) {
      query = query.eq('month_year', monthYear);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as PerkUsageAnalytics[];
  },

  // Enhanced Card Management Operations

  // Code Generation Settings
  async getCodeGenerationSettings() {
    const { data, error } = await supabase
      .from('code_generation_settings')
      .select('*')
      .order('setting_type', { ascending: true })
      .order('generation_mode', { ascending: true });

    if (error) throw error;
    return data as CodeGenerationSettings[];
  },

  async updateCodeGenerationSetting(id: string, updates: Partial<CodeGenerationSettings>) {
    const { data, error } = await supabase
      .from('code_generation_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CodeGenerationSettings;
  },

  async createCodeGenerationSetting(setting: Omit<CodeGenerationSettings, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('code_generation_settings')
      .insert({
        ...setting,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as CodeGenerationSettings;
  },

  // Location Codes Management
  async getLocationCodes() {
    const { data, error } = await supabase
      .from('location_codes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as LocationCode[];
  },

  async getAllLocationCodes() {
    const { data, error } = await supabase
      .from('location_codes')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as LocationCode[];
  },

  async createLocationCode(locationCode: Omit<LocationCode, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('location_codes')
      .insert({
        ...locationCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as LocationCode;
  },

  async updateLocationCode(id: string, updates: Partial<LocationCode>) {
    const { data, error } = await supabase
      .from('location_codes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as LocationCode;
  },

  // Advanced Code Generation
  async generateBatchNumber(mode: 'auto' | 'manual' | 'range', customInput?: string, locationPrefix?: string) {
    const { data, error } = await supabase
      .rpc('generate_batch_number', {
        generation_mode: mode,
        custom_input: customInput,
        location_prefix: locationPrefix || 'PHL'
      });

    if (error) throw error;
    return data as string;
  },

  async generateControlNumber(batchPrefix: string, cardIndex: number, mode: 'auto' | 'manual' | 'range' = 'auto', customFormat?: string) {
    const { data, error } = await supabase
      .rpc('generate_control_number', {
        batch_prefix: batchPrefix,
        card_index: cardIndex,
        generation_mode: mode,
        custom_format: customFormat
      });

    if (error) throw error;
    return data as string;
  },

  async generatePasscode(locationCode: string, mode: 'auto' | 'manual' | 'range' = 'auto', customPasscode?: string) {
    const { data, error } = await supabase
      .rpc('generate_passcode', {
        location_code: locationCode,
        generation_mode: mode,
        custom_passcode: customPasscode
      });

    if (error) throw error;
    return data as string;
  },

  // Code Normalization (handles dashes automatically)
  async normalizeCode(inputCode: string, codeType: 'control' | 'batch' | 'passcode') {
    const { data, error } = await supabase
      .rpc('normalize_code', {
        input_code: inputCode,
        code_type: codeType
      });

    if (error) throw error;
    return data as string;
  },

  // Enhanced Card Lookup with automatic code normalization
  async getCardByControlNumberNormalized(controlNumber: string, passcode?: string) {
    // Normalize the codes first
    const normalizedControl = await this.normalizeCode(controlNumber, 'control');
    const normalizedPasscode = passcode ? await this.normalizeCode(passcode, 'passcode') : undefined;

    return this.getCardByControlNumber(normalizedControl, normalizedPasscode);
  },

  // Card Code History
  async getCardCodeHistory(cardId: string) {
    const { data, error } = await supabase
      .from('card_code_history')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CardCodeHistory[];
  },

  async recordCardCodeChange(
    cardId: string,
    changeType: CardCodeHistory['change_type'],
    fieldName: string,
    oldValue: string,
    newValue: string,
    changedBy?: string,
    reason?: string
  ) {
    const { data, error } = await supabase
      .from('card_code_history')
      .insert({
        card_id: cardId,
        change_type: changeType,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        changed_by: changedBy,
        change_reason: reason,
        metadata: {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as CardCodeHistory;
  },

  // System Version Management for Real-time Updates
  async getSystemVersions() {
    const { data, error } = await supabase
      .from('system_versions')
      .select('*')
      .order('component', { ascending: true });

    if (error) throw error;
    return data as SystemVersion[];
  },

  async getComponentVersion(component: SystemVersion['component']) {
    const { data, error } = await supabase
      .from('system_versions')
      .select('*')
      .eq('component', component)
      .single();

    if (error) throw error;
    return data as SystemVersion;
  },

  // User Session State Management
  async saveUserSessionState(userId: string, userType: UserSessionState['user_type'], componentName: string, formData: Record<string, any>, draftState: Record<string, any>) {
    const { data, error } = await supabase
      .from('user_session_state')
      .upsert({
        user_id: userId,
        user_type: userType,
        component_name: componentName,
        form_data: formData,
        draft_state: draftState,
        last_saved: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserSessionState;
  },

  async getUserSessionState(userId: string, componentName: string) {
    const { data, error } = await supabase
      .from('user_session_state')
      .select('*')
      .eq('user_id', userId)
      .eq('component_name', componentName)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as UserSessionState | null;
  },

  async clearExpiredSessions() {
    const { error } = await supabase
      .from('user_session_state')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  },

  // Enhanced Card Operations with Admin Controls
  async updateCardCodes(cardId: string, updates: {
    control_number?: string;
    passcode?: string;
    location_code?: string;
    admin_notes?: string;
  }, adminId?: string) {
    // Get current card data for history tracking
    const currentCard = await supabase
      .from('cards')
      .select('control_number, passcode, location_code')
      .eq('id', cardId)
      .single();

    if (currentCard.error) throw currentCard.error;

    // Update the card
    const { data, error } = await supabase
      .from('cards')
      .update({
        ...updates,
        admin_override: true,
        last_modified_by: adminId,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) throw error;

    // Record changes in history
    for (const [field, newValue] of Object.entries(updates)) {
      if (field in currentCard.data && newValue !== undefined) {
        const oldValue = (currentCard.data as any)[field];
        if (oldValue !== newValue) {
          await this.recordCardCodeChange(
            cardId,
            field.includes('control') ? 'control_updated' : field.includes('passcode') ? 'passcode_updated' : 'batch_updated',
            field,
            oldValue,
            newValue as string,
            adminId,
            'Admin manual update'
          );
        }
      }
    }

    return data as Card;
  },

  async getCardBatchById(batchId: string) {
    const { data, error } = await supabase
      .from('card_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) throw error;
    return data as CardBatch;
  },

  // Generate cards with enhanced controls
  async generateCardsWithSettings(
    batchId: string,
    count: number,
    settings: {
      generationMode: 'auto' | 'manual' | 'range';
      locationCode: string;
      customPrefix?: string;
      startIndex?: number;
      endIndex?: number;
    },
    adminId?: string
  ) {
    const cards = [];
    const batch = await this.getCardBatchById(batchId);

    for (let i = 0; i < count; i++) {
      const cardIndex = (settings.startIndex || 1) + i;

      // Generate control number
      const controlNumber = await this.generateControlNumber(
        batch.batch_number,
        cardIndex,
        settings.generationMode,
        settings.customPrefix ? `${settings.customPrefix}-${cardIndex.toString().padStart(3, '0')}` : undefined
      );

      // Generate passcode
      const passcode = await this.generatePasscode(
        settings.locationCode,
        settings.generationMode
      );

      const cardData = {
        batch_id: batchId,
        control_number: controlNumber,
        passcode: passcode,
        location_code: settings.locationCode,
        status: 'unactivated' as const,
        generation_method: settings.generationMode,
        admin_override: settings.generationMode !== 'auto',
        last_modified_by: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      cards.push(cardData);
    }

    // Insert all cards
    const { data, error } = await supabase
      .from('cards')
      .insert(cards)
      .select();

    if (error) throw error;

    // Record creation history
    for (const card of data) {
      await this.recordCardCodeChange(
        card.id,
        'created',
        'card_created',
        '',
        `Control: ${card.control_number}, Passcode: ${card.passcode}`,
        adminId,
        `Batch generation with ${settings.generationMode} mode`
      );
    }

    return data as Card[];
  },

  // Additional method needed by AdminCardCodeManagement
  async getAllCardBatches() {
    const { data, error } = await supabase
      .from('card_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CardBatch[];
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