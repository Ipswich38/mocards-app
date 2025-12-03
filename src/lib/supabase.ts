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