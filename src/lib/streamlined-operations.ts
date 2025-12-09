import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Core Types
export interface Clinic {
  id: string;
  clinic_name: string;
  clinic_code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  status: 'active' | 'inactive' | 'suspended';
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface CardBatch {
  id: string;
  batch_number: string;
  total_cards: number;
  cards_assigned: number;
  status: 'active' | 'completed' | 'archived';
  created_by?: string;
  created_at: string;
  notes?: string;
}

export interface Card {
  id: string;
  batch_id?: string;
  clinic_id?: string;
  control_number: string;
  passcode: string;
  location_code: string;
  status: 'unassigned' | 'assigned' | 'activated' | 'expired' | 'suspended';
  assigned_at?: string;
  activated_at?: string;
  expires_at?: string;
  generation_method: 'auto' | 'manual' | 'range';
  created_at: string;
  updated_at: string;
}

export interface CardPerk {
  id: string;
  card_id: string;
  perk_type: 'consultation' | 'cleaning' | 'xray' | 'extraction' | 'filling';
  perk_value: number;
  claimed: boolean;
  claimed_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface LocationCode {
  id: string;
  code: string;
  location_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  password_hash: string;
  full_name?: string;
  email?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

// Streamlined Database Operations
export const streamlinedOps = {
  // ============================================================================
  // CARD GENERATION OPERATIONS
  // ============================================================================

  async createCardBatch(batchData: {
    batch_number: string;
    total_cards: number;
    created_by: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('card_batches')
      .insert(batchData)
      .select()
      .single();

    if (error) throw error;
    return data as CardBatch;
  },

  async generateCardsForBatch(
    batchId: string,
    batchNumber: string,
    locationCode: string,
    cardCount: number
  ) {
    const cards = [];

    for (let i = 1; i <= cardCount; i++) {
      const controlNumber = await this.generateControlNumber(batchNumber, i);
      const passcode = await this.generatePasscode(locationCode);

      cards.push({
        batch_id: batchId,
        control_number: controlNumber,
        passcode: passcode,
        location_code: locationCode,
        status: 'unassigned' as const,
        generation_method: 'auto' as const,
      });
    }

    const { data, error } = await supabase
      .from('cards')
      .insert(cards)
      .select();

    if (error) throw error;

    // Create default perks for each card
    for (const card of data) {
      await this.createDefaultPerksForCard(card.id);
    }

    return data as Card[];
  },

  async generateControlNumber(batchNumber: string, sequenceNumber: number) {
    const { data, error } = await supabase
      .rpc('generate_control_number', {
        batch_prefix: batchNumber,
        sequence_number: sequenceNumber,
        location_prefix: 'PHL'
      });

    if (error) throw error;
    return data as string;
  },

  async generatePasscode(locationCode: string) {
    const { data, error } = await supabase
      .rpc('generate_passcode', {
        location_code: locationCode
      });

    if (error) throw error;
    return data as string;
  },

  async createDefaultPerksForCard(cardId: string) {
    const defaultPerks = [
      { perk_type: 'consultation', perk_value: 500.00 },
      { perk_type: 'cleaning', perk_value: 800.00 },
      { perk_type: 'xray', perk_value: 1000.00 },
      { perk_type: 'extraction', perk_value: 1500.00 },
      { perk_type: 'filling', perk_value: 1200.00 },
    ];

    const perks = defaultPerks.map(perk => ({
      card_id: cardId,
      ...perk,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    }));

    const { error } = await supabase
      .from('card_perks')
      .insert(perks);

    if (error) throw error;
  },

  // ============================================================================
  // CLINIC MANAGEMENT OPERATIONS
  // ============================================================================

  async createClinic(clinicData: Omit<Clinic, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('clinics')
      .insert({
        ...clinicData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  async getAllClinics() {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('clinic_name');

    if (error) throw error;
    return data as Clinic[];
  },

  async getActiveClinics() {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('status', 'active')
      .order('clinic_name');

    if (error) throw error;
    return data as Clinic[];
  },

  async updateClinic(clinicId: string, updates: Partial<Clinic>) {
    const { data, error } = await supabase
      .from('clinics')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  async getClinicByCode(clinicCode: string) {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('clinic_code', clinicCode)
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  // ============================================================================
  // CARD ASSIGNMENT OPERATIONS
  // ============================================================================

  async assignCardsToClinic(clinicId: string, cardCount: number) {
    const { data, error } = await supabase
      .rpc('assign_cards_to_clinic', {
        p_clinic_id: clinicId,
        p_card_count: cardCount
      });

    if (error) throw error;
    return data as number; // Returns number of cards assigned
  },

  async getUnassignedCards(limit: number = 100) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        card_batches!inner(batch_number)
      `)
      .eq('status', 'unassigned')
      .order('created_at')
      .limit(limit);

    if (error) throw error;
    return data as (Card & { card_batches: { batch_number: string } })[];
  },

  async getClinicCards(clinicId: string) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        card_batches!inner(batch_number)
      `)
      .eq('clinic_id', clinicId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data as (Card & { card_batches: { batch_number: string } })[];
  },

  async activateCard(controlNumber: string, passcode: string) {
    // First verify the card exists and passcode matches
    const { data: card, error: lookupError } = await supabase
      .from('cards')
      .select('*')
      .eq('control_number', controlNumber.toUpperCase())
      .eq('passcode', passcode.toUpperCase())
      .eq('status', 'assigned')
      .single();

    if (lookupError) throw lookupError;

    // Activate the card
    const { data, error } = await supabase
      .from('cards')
      .update({
        status: 'activated',
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      })
      .eq('id', card.id)
      .select()
      .single();

    if (error) throw error;
    return data as Card;
  },

  // ============================================================================
  // LOOKUP AND VERIFICATION OPERATIONS
  // ============================================================================

  async lookupCard(controlNumber: string, passcode: string) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        clinics(clinic_name),
        card_perks(*)
      `)
      .eq('control_number', controlNumber.toUpperCase())
      .eq('passcode', passcode.toUpperCase())
      .single();

    if (error) throw error;
    return data as Card & {
      clinics: { clinic_name: string } | null;
      card_perks: CardPerk[];
    };
  },

  async claimPerk(cardId: string, perkType: CardPerk['perk_type']) {
    const { data, error } = await supabase
      .from('card_perks')
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .eq('card_id', cardId)
      .eq('perk_type', perkType)
      .eq('claimed', false)
      .select()
      .single();

    if (error) throw error;
    return data as CardPerk;
  },

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  async getLocationCodes() {
    const { data, error } = await supabase
      .from('location_codes')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (error) throw error;
    return data as LocationCode[];
  },

  async createLocationCode(locationData: Omit<LocationCode, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('location_codes')
      .insert([locationData])
      .select()
      .single();

    if (error) throw error;
    return data as LocationCode;
  },

  async getAllBatches() {
    const { data, error } = await supabase
      .from('card_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CardBatch[];
  },

  async getBatchById(batchId: string) {
    const { data, error } = await supabase
      .from('card_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) throw error;
    return data as CardBatch;
  },

  // Authentication helper (simplified)
  async authenticateAdmin(username: string, password: string) {
    const { data, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    // In production, use proper password hashing verification
    // For demo purposes, using simple comparison
    if (password === 'admin123') { // Demo password
      return data as AdminAccount;
    } else {
      throw new Error('Invalid password');
    }
  },

  async authenticateClinic(clinicCode: string, password: string) {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('clinic_code', clinicCode)
      .eq('status', 'active')
      .single();

    if (error) throw error;

    // In production, use proper password hashing verification
    // For demo purposes, using simple comparison
    if (password === 'clinic123') { // Demo password
      return data as Clinic;
    } else {
      throw new Error('Invalid password');
    }
  },

  // Dashboard statistics
  async getDashboardStats() {
    const [
      totalClinics,
      totalBatches,
      totalCards,
      unassignedCards,
      assignedCards,
      activatedCards
    ] = await Promise.all([
      supabase.from('clinics').select('id', { count: 'exact' }),
      supabase.from('card_batches').select('id', { count: 'exact' }),
      supabase.from('cards').select('id', { count: 'exact' }),
      supabase.from('cards').select('id', { count: 'exact' }).eq('status', 'unassigned'),
      supabase.from('cards').select('id', { count: 'exact' }).eq('status', 'assigned'),
      supabase.from('cards').select('id', { count: 'exact' }).eq('status', 'activated'),
    ]);

    return {
      totalClinics: totalClinics.count || 0,
      totalBatches: totalBatches.count || 0,
      totalCards: totalCards.count || 0,
      unassignedCards: unassignedCards.count || 0,
      assignedCards: assignedCards.count || 0,
      activatedCards: activatedCards.count || 0,
    };
  }
};

// Code normalization utilities
export const codeUtils = {
  normalizeControlNumber(input: string): string {
    // Remove spaces and convert to uppercase
    const cleaned = input.replace(/\s/g, '').toUpperCase();

    // Add dashes in standard format: PHL-BATCH-0001
    if (!cleaned.includes('-') && cleaned.length >= 8) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
    }

    return cleaned;
  },

  normalizePasscode(input: string): string {
    // Remove spaces and convert to uppercase
    const cleaned = input.replace(/\s/g, '').toUpperCase();

    // Add dash in standard format: 001-1234
    if (!cleaned.includes('-') && cleaned.length >= 6) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`;
    }

    return cleaned;
  },

  generateBatchNumber(): string {
    const timestamp = new Date().getTime().toString().slice(-6);
    return `BTH${timestamp}`;
  }
};

// Export everything for easy access
export default streamlinedOps;