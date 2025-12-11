import { createClient } from '@supabase/supabase-js';

// Configuration with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'https://lxyexybnotixgpzflota.supabase.co') {
  console.warn('Using default Supabase URL. Please set VITE_SUPABASE_URL in your environment.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
  console.warn('Using default Supabase key. Please set VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence for admin operations
    autoRefreshToken: false,
  },
});

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
  passcode?: string; // Optional for backward compatibility
  control_number_v2?: string; // New MOC format
  location_code_v2?: string;
  clinic_code_v2?: string;
  card_number?: number;
  is_activated?: boolean;
  activated_by_clinic_id?: string;
  location_code: string;
  status: 'unassigned' | 'assigned' | 'activated' | 'expired' | 'suspended' | 'unactivated';
  assigned_at?: string;
  activated_at?: string;
  expires_at?: string;
  generation_method?: 'auto' | 'manual' | 'range';
  created_at: string;
  updated_at: string;
  migration_version?: number;
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

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'declined' | 'completed' | 'cancelled';
  requested_by: 'admin' | 'patient' | 'clinic';
  clinic_notified: boolean;
  clinic_response?: string;
  responded_by?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicMessage {
  id: string;
  clinic_id: string;
  subject: string;
  message: string;
  message_type: 'inquiry' | 'request' | 'issue' | 'general';
  status: 'unread' | 'read' | 'responded';
  sent_by: string; // clinic staff name
  admin_response?: string;
  admin_responded_by?: string;
  admin_responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CardActivationLog {
  id: string;
  card_id: string;
  clinic_id: string;
  activated_by_name: string;
  activated_by_signature: string;
  activation_timestamp: string;
  notes?: string;
  created_at: string;
}

export interface PerkRedemptionLog {
  id: string;
  card_id: string;
  perk_id: string;
  clinic_id: string;
  redeemed_by_name: string;
  redeemed_by_signature: string;
  redemption_value: number;
  redemption_timestamp: string;
  notes?: string;
  created_at: string;
}

// New Card System V2 Interfaces
export interface LocationCodeV2 {
  id: string;
  code: string; // 01-16
  region_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicCodeByRegion {
  id: string;
  clinic_code: string; // 4-digit code
  region_type: 'visayas' | 'luzon_4a' | 'ncr';
  region_name: string;
  location_code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DefaultPerkTemplate {
  id: string;
  perk_name: string;
  perk_type: 'discount' | 'cashback' | 'freebie' | 'points' | 'service' | 'consultation' | 'cleaning' | 'xray' | 'extraction' | 'filling';
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

export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TextLabel {
  id: string;
  label_key: string;
  label_value: string;
  label_category: string;
  description?: string;
  is_customizable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CodeFormat {
  id: string;
  format_name: string;
  format_type: 'control_number' | 'passcode' | 'batch_number' | 'clinic_code';
  format_template: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
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
    try {
      // Validate inputs
      if (!batchId || !batchNumber || !locationCode || cardCount <= 0) {
        throw new Error('Invalid parameters for card generation');
      }

      if (cardCount > 10000) {
        throw new Error('Maximum 10,000 cards per batch allowed');
      }

      // Verify location code exists
      const { data: locationExists } = await supabase
        .from('location_codes')
        .select('code')
        .eq('code', locationCode)
        .eq('is_active', true)
        .single();

      if (!locationExists) {
        throw new Error(`Location code '${locationCode}' not found or inactive`);
      }

      const cards = [];

      for (let i = 1; i <= cardCount; i++) {
        try {
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
        } catch (err) {
          throw new Error(`Failed to generate card ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      const { data, error } = await supabase
        .from('cards')
        .insert(cards)
        .select();

      if (error) {
        throw new Error(`Database error inserting cards: ${error.message}`);
      }

      if (!data || data.length !== cardCount) {
        throw new Error(`Expected ${cardCount} cards, but only ${data?.length || 0} were created`);
      }

      // Create default perks for each card
      for (const card of data) {
        try {
          await this.createDefaultPerksForCard(card.id);
        } catch (err) {
          console.warn(`Failed to create perks for card ${card.id}:`, err);
          // Continue with other cards even if perks fail
        }
      }

      return data as Card[];
    } catch (err) {
      console.error('Error generating cards for batch:', err);
      throw err;
    }
  },

  async generateControlNumber(batchNumber: string, sequenceNumber: number, maxRetries: number = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Generate control number locally instead of using database function
      const paddedSequence = (sequenceNumber + attempt).toString().padStart(4, '0');
      const controlNumber = `PHL-${batchNumber}-${paddedSequence}`;

      // Check if this control number already exists
      const { data: existingCard, error: lookupError } = await supabase
        .from('cards')
        .select('id')
        .eq('control_number', controlNumber)
        .single();

      // If no existing card found (404 error is expected), control number is unique
      if (lookupError && lookupError.code === 'PGRST116') {
        return controlNumber;
      }

      // If other error occurred, throw it
      if (lookupError && lookupError.code !== 'PGRST116') {
        throw lookupError;
      }

      // If card exists, try with next sequence number
      if (existingCard && attempt < maxRetries - 1) {
        console.warn(`Control number collision detected: ${controlNumber}. Trying next sequence... (attempt ${attempt + 1}/${maxRetries})`);
        continue;
      }

      // If we've exhausted retries and still have collision
      if (existingCard && attempt === maxRetries - 1) {
        throw new Error(`Failed to generate unique control number after ${maxRetries} attempts. Batch: ${batchNumber}, Sequence: ${sequenceNumber}`);
      }
    }

    throw new Error('Unexpected error in control number generation');
  },

  async generatePasscode(locationCode: string, maxRetries: number = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Generate passcode locally: 3-digit location code + 4-digit random number
      const randomNumber = Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
      const passcode = `${locationCode}-${randomNumber}`;

      // Check if this passcode already exists
      const { data: existingCard, error: lookupError } = await supabase
        .from('cards')
        .select('id')
        .eq('passcode', passcode)
        .single();

      // If no existing card found (404 error is expected), passcode is unique
      if (lookupError && lookupError.code === 'PGRST116') {
        return passcode;
      }

      // If other error occurred, throw it
      if (lookupError && lookupError.code !== 'PGRST116') {
        throw lookupError;
      }

      // If card exists, try again (only if we have retries left)
      if (existingCard && attempt < maxRetries - 1) {
        console.warn(`Passcode collision detected: ${passcode}. Retrying... (attempt ${attempt + 1}/${maxRetries})`);
        continue;
      }

      // If we've exhausted retries and still have collision
      if (existingCard && attempt === maxRetries - 1) {
        throw new Error(`Failed to generate unique passcode after ${maxRetries} attempts. Location: ${locationCode}`);
      }
    }

    throw new Error('Unexpected error in passcode generation');
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
  // CARD ASSIGNMENT AND ACTIVATION OPERATIONS
  // ============================================================================

  async assignCardsToClinic(cardIds: string[], clinicId: string, assignedBy?: string) {
    const { data, error } = await supabase
      .from('cards')
      .update({
        clinic_id: clinicId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', cardIds)
      .eq('status', 'unassigned') // Only assign unassigned cards
      .select();

    if (error) throw error;

    // Log the assignment
    for (const card of data) {
      try {
        await this.logCardTransaction(card.id, 'assigned', assignedBy || 'system', {
          assigned_to_clinic: clinicId,
          previous_status: 'unassigned'
        });
      } catch (logError) {
        console.warn(`Failed to log assignment for card ${card.id}:`, logError);
      }
    }

    return data as Card[];
  },

  async activateCard(cardId: string, clinicId: string, activatedBy: string, activatedByName?: string) {
    // First check if card is assigned to this clinic
    const { data: cardCheck, error: checkError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('clinic_id', clinicId)
      .eq('status', 'assigned')
      .single();

    if (checkError || !cardCheck) {
      throw new Error('Card not found or not assigned to this clinic');
    }

    // Activate the card
    const { data, error } = await supabase
      .from('cards')
      .update({
        status: 'activated',
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from activation
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) throw error;

    // Log the activation
    await this.logCardTransaction(cardId, 'activated', activatedBy, {
      activated_by_name: activatedByName,
      activation_clinic: clinicId,
      expires_at: data.expires_at,
      previous_status: 'assigned'
    });

    return data as Card;
  },

  async logCardTransaction(cardId: string, transactionType: string, performedBy: string, details: Record<string, any>) {
    const { error } = await supabase
      .from('card_transactions')
      .insert({
        card_id: cardId,
        transaction_type: transactionType,
        performed_by: performedBy,
        details: details,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.warn(`Failed to log transaction for card ${cardId}:`, error);
    }
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
    try {
      // Validate input data
      if (!locationData.code || !locationData.location_name) {
        throw new Error('Location code and name are required');
      }

      // Ensure code is 3 characters and uppercase
      const sanitizedData = {
        ...locationData,
        code: locationData.code.trim().toUpperCase(),
        location_name: locationData.location_name.trim(),
        description: locationData.description?.trim() || null,
      };

      if (sanitizedData.code.length !== 3) {
        throw new Error('Location code must be exactly 3 characters');
      }

      const { data, error } = await supabase
        .from('location_codes')
        .insert([sanitizedData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error(`Location code '${sanitizedData.code}' already exists`);
        }
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('Failed to create location code - no data returned');
      }

      return data as LocationCode;
    } catch (err) {
      console.error('Error creating location code:', err);
      throw err;
    }
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
  },

  // ============================================================================
  // ENHANCED CRUD OPERATIONS
  // ============================================================================

  // LOCATION CODES CRUD
  async updateLocationCode(locationId: string, updates: Partial<LocationCode>) {
    const { data, error } = await supabase
      .from('location_codes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', locationId)
      .select()
      .single();

    if (error) throw error;
    return data as LocationCode;
  },

  async deleteLocationCode(locationId: string) {
    // Check if location code is being used by any cards
    const { data: cardsUsingLocation, error: checkError } = await supabase
      .from('cards')
      .select('id')
      .eq('location_code', (await this.getLocationCodeById(locationId)).code)
      .limit(1);

    if (checkError) throw checkError;

    if (cardsUsingLocation && cardsUsingLocation.length > 0) {
      throw new Error('Cannot delete location code - it is being used by existing cards');
    }

    const { error } = await supabase
      .from('location_codes')
      .delete()
      .eq('id', locationId);

    if (error) throw error;
    return true;
  },

  async getLocationCodeById(locationId: string) {
    const { data, error } = await supabase
      .from('location_codes')
      .select('*')
      .eq('id', locationId)
      .single();

    if (error) throw error;
    return data as LocationCode;
  },

  async getAllLocationCodes() {
    const { data, error } = await supabase
      .from('location_codes')
      .select('*')
      .order('code');

    if (error) throw error;
    return data as LocationCode[];
  },

  // CLINIC CRUD ENHANCEMENTS
  async deleteClinic(clinicId: string) {
    // Check if clinic has assigned cards
    const { data: assignedCards, error: checkError } = await supabase
      .from('cards')
      .select('id')
      .eq('clinic_id', clinicId)
      .limit(1);

    if (checkError) throw checkError;

    if (assignedCards && assignedCards.length > 0) {
      throw new Error('Cannot delete clinic - it has assigned cards. Please reassign cards first.');
    }

    const { error } = await supabase
      .from('clinics')
      .delete()
      .eq('id', clinicId);

    if (error) throw error;
    return true;
  },

  async getClinicById(clinicId: string) {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicId)
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  async getClinicStats(clinicId: string) {
    const [totalCards, assignedCards, activatedCards] = await Promise.all([
      supabase.from('cards').select('id', { count: 'exact' }).eq('clinic_id', clinicId),
      supabase.from('cards').select('id', { count: 'exact' }).eq('clinic_id', clinicId).eq('status', 'assigned'),
      supabase.from('cards').select('id', { count: 'exact' }).eq('clinic_id', clinicId).eq('status', 'activated'),
    ]);

    return {
      totalCards: totalCards.count || 0,
      assignedCards: assignedCards.count || 0,
      activatedCards: activatedCards.count || 0,
    };
  },

  // BATCH CRUD ENHANCEMENTS
  async updateBatch(batchId: string, updates: Partial<CardBatch>) {
    const { data, error } = await supabase
      .from('card_batches')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)
      .select()
      .single();

    if (error) throw error;
    return data as CardBatch;
  },

  async deleteBatch(batchId: string) {
    // Check if batch has any cards
    const { data: batchCards, error: checkError } = await supabase
      .from('cards')
      .select('id')
      .eq('batch_id', batchId)
      .limit(1);

    if (checkError) throw checkError;

    if (batchCards && batchCards.length > 0) {
      throw new Error('Cannot delete batch - it contains cards. Delete cards first or use cascade delete.');
    }

    const { error } = await supabase
      .from('card_batches')
      .delete()
      .eq('id', batchId);

    if (error) throw error;
    return true;
  },

  async deleteBatchCascade(batchId: string) {
    // This will cascade delete all cards in the batch due to foreign key constraint
    const { error } = await supabase
      .from('card_batches')
      .delete()
      .eq('id', batchId);

    if (error) throw error;
    return true;
  },

  // CARD CRUD OPERATIONS
  async getCardById(cardId: string) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        clinics(clinic_name, clinic_code),
        card_batches(batch_number),
        card_perks(*)
      `)
      .eq('id', cardId)
      .single();

    if (error) throw error;
    return data as Card & {
      clinics: { clinic_name: string; clinic_code: string } | null;
      card_batches: { batch_number: string } | null;
      card_perks: CardPerk[];
    };
  },

  async updateCard(cardId: string, updates: Partial<Card>) {
    const { data, error } = await supabase
      .from('cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) throw error;
    return data as Card;
  },

  async deleteCard(cardId: string) {
    // This will cascade delete all perks due to foreign key constraint
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;
    return true;
  },

  async getAllCards(limit: number = 100, offset: number = 0) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        clinics(clinic_name, clinic_code),
        card_batches(batch_number)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as (Card & {
      clinics: { clinic_name: string; clinic_code: string } | null;
      card_batches: { batch_number: string } | null;
    })[];
  },

  // SYSTEM CONFIGURATION CRUD
  async getSystemConfig() {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) throw error;
    return data as SystemConfig[];
  },

  async getConfigByKey(configKey: string) {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', configKey)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data as SystemConfig;
  },

  async updateConfig(configKey: string, configValue: string) {
    const { data, error } = await supabase
      .from('system_config')
      .update({
        config_value: configValue,
        updated_at: new Date().toISOString(),
      })
      .eq('config_key', configKey)
      .select()
      .single();

    if (error) throw error;
    return data as SystemConfig;
  },

  async createConfig(configData: Omit<SystemConfig, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('system_config')
      .insert({
        ...configData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as SystemConfig;
  },

  // TEXT LABELS CRUD
  async getTextLabels() {
    const { data, error } = await supabase
      .from('text_labels')
      .select('*')
      .order('label_category', { ascending: true });

    if (error) throw error;
    return data as TextLabel[];
  },

  async getLabelByKey(labelKey: string) {
    const { data, error } = await supabase
      .from('text_labels')
      .select('*')
      .eq('label_key', labelKey)
      .single();

    if (error) throw error;
    return data as TextLabel;
  },

  async updateLabel(labelKey: string, labelValue: string) {
    const { data, error } = await supabase
      .from('text_labels')
      .update({
        label_value: labelValue,
        updated_at: new Date().toISOString(),
      })
      .eq('label_key', labelKey)
      .eq('is_customizable', true)
      .select()
      .single();

    if (error) throw error;
    return data as TextLabel;
  },

  async createLabel(labelData: Omit<TextLabel, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('text_labels')
      .insert({
        ...labelData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as TextLabel;
  },

  // CODE FORMATS CRUD
  async getCodeFormats() {
    const { data, error } = await supabase
      .from('code_formats')
      .select('*')
      .eq('is_active', true)
      .order('format_type', { ascending: true });

    if (error) throw error;
    return data as CodeFormat[];
  },

  async getFormatsByType(formatType: CodeFormat['format_type']) {
    const { data, error } = await supabase
      .from('code_formats')
      .select('*')
      .eq('format_type', formatType)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return data as CodeFormat[];
  },

  async updateCodeFormat(formatId: string, updates: Partial<CodeFormat>) {
    const { data, error } = await supabase
      .from('code_formats')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', formatId)
      .select()
      .single();

    if (error) throw error;
    return data as CodeFormat;
  },

  async createCodeFormat(formatData: Omit<CodeFormat, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('code_formats')
      .insert({
        ...formatData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as CodeFormat;
  },

  async deleteCodeFormat(formatId: string) {
    const { error } = await supabase
      .from('code_formats')
      .delete()
      .eq('id', formatId);

    if (error) throw error;
    return true;
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

  async generateBatchNumber(): Promise<string> {
    try {
      // Get all existing batch numbers to ensure uniqueness
      const { data: allBatches, error } = await supabase
        .from('card_batches')
        .select('batch_number')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let nextBatchNumber = 1;
      const existingBatchNumbers = new Set(allBatches?.map(b => b.batch_number) || []);

      // Find the next available sequential number
      while (true) {
        const candidateBatch = `BATCH-${nextBatchNumber.toString().padStart(3, '0')}`;

        if (!existingBatchNumbers.has(candidateBatch)) {
          // Double-check with database to ensure no race condition
          const { data: existingBatch, error: checkError } = await supabase
            .from('card_batches')
            .select('batch_number')
            .eq('batch_number', candidateBatch)
            .single();

          // If no existing batch found (404 error is expected), batch number is unique
          if (checkError && checkError.code === 'PGRST116') {
            return candidateBatch;
          }

          // If other error occurred, throw it
          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          // If batch exists, increment and try again
          if (existingBatch) {
            existingBatchNumbers.add(candidateBatch);
            nextBatchNumber++;
            continue;
          }

          // Should not reach here, but return the candidate if we do
          return candidateBatch;
        }

        nextBatchNumber++;

        // Prevent infinite loop - cap at 999 sequential batches
        if (nextBatchNumber > 999) {
          // Fallback to timestamp-based naming
          const timestamp = new Date().getTime().toString().slice(-6);
          const fallbackBatch = `BTH${timestamp}`;

          // Ensure timestamp-based batch is also unique
          const { error: fallbackError } = await supabase
            .from('card_batches')
            .select('batch_number')
            .eq('batch_number', fallbackBatch)
            .single();

          if (fallbackError && fallbackError.code === 'PGRST116') {
            console.warn('Reached maximum sequential batch numbers, using timestamp fallback:', fallbackBatch);
            return fallbackBatch;
          } else {
            throw new Error('Unable to generate unique batch number - both sequential and timestamp methods exhausted');
          }
        }
      }
    } catch (err) {
      console.error('Error generating batch number:', err);
      throw new Error(`Failed to generate unique batch number: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },

  // ============================================================================
  // FACTORY RESET OPERATIONS
  // ============================================================================

  async factoryReset() {
    // Complete system reset - removes ALL data
    try {
      await Promise.all([
        // Delete in order to respect foreign key constraints
        supabase.from('card_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('perk_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('card_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clinic_perks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('perks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clinics').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('admin_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      // Reset system configuration to defaults
      await this.resetSettings();
    } catch (error) {
      console.error('Factory reset error:', error);
      throw new Error('Failed to perform factory reset');
    }
  },

  async resetCards() {
    // Reset only card-related data
    try {
      await Promise.all([
        supabase.from('card_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('card_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
    } catch (error) {
      console.error('Card reset error:', error);
      throw new Error('Failed to reset card data');
    }
  },

  async resetClinics() {
    // Reset only clinic-related data
    try {
      await Promise.all([
        supabase.from('clinic_perks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clinics').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        // Also reset card assignments
        supabase.from('cards').update({ clinic_id: null, assigned_at: null }).neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
    } catch (error) {
      console.error('Clinic reset error:', error);
      throw new Error('Failed to reset clinic data');
    }
  },

  async resetPerks() {
    // Reset only perk-related data
    try {
      await Promise.all([
        supabase.from('perk_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clinic_perks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('perks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
    } catch (error) {
      console.error('Perk reset error:', error);
      throw new Error('Failed to reset perk data');
    }
  },

  async resetSettings() {
    // Reset system configuration to defaults
    try {
      // Clear existing config
      await supabase.from('system_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('text_labels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('code_formats').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert default configurations
      const defaultConfigs = [
        { config_key: 'app_name', config_value: 'MOCARDS', config_type: 'string', description: 'Application name displayed in headers', category: 'branding' },
        { config_key: 'app_subtitle', config_value: 'Medical Cards Management System', config_type: 'string', description: 'Application subtitle', category: 'branding' },
        { config_key: 'default_cards_per_batch', config_value: '500', config_type: 'number', description: 'Default number of cards per batch', category: 'generation' },
        { config_key: 'max_cards_per_batch', config_value: '10000', config_type: 'number', description: 'Maximum cards allowed per batch', category: 'generation' },
        { config_key: 'card_expiry_months', config_value: '12', config_type: 'number', description: 'Default card expiry in months', category: 'generation' },
        { config_key: 'enable_bulk_operations', config_value: 'true', config_type: 'boolean', description: 'Enable bulk operations', category: 'features' },
        { config_key: 'location_code_length', config_value: '3', config_type: 'number', description: 'Length of location codes', category: 'formatting' },
        { config_key: 'require_clinic_approval', config_value: 'false', config_type: 'boolean', description: 'Require admin approval for new clinics', category: 'workflow' },
      ];

      await supabase.from('system_config').insert(
        defaultConfigs.map(config => ({
          ...config,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      );

      // Insert default text labels
      const defaultLabels = [
        { label_key: 'nav_overview', label_value: 'Overview', label_category: 'navigation', description: 'Overview tab label' },
        { label_key: 'nav_generate', label_value: 'Generate Cards', label_category: 'navigation', description: 'Generate cards tab label' },
        { label_key: 'nav_clinics', label_value: 'Manage Clinics', label_category: 'navigation', description: 'Clinics management tab label' },
        { label_key: 'btn_create', label_value: 'Create', label_category: 'buttons', description: 'Create button label' },
        { label_key: 'btn_update', label_value: 'Update', label_category: 'buttons', description: 'Update button label' },
        { label_key: 'status_active', label_value: 'Active', label_category: 'status', description: 'Active status label' },
        { label_key: 'status_unassigned', label_value: 'Unassigned', label_category: 'status', description: 'Unassigned card status' },
        { label_key: 'status_assigned', label_value: 'Assigned', label_category: 'status', description: 'Assigned card status' },
        { label_key: 'status_activated', label_value: 'Activated', label_category: 'status', description: 'Activated card status' },
      ];

      await supabase.from('text_labels').insert(
        defaultLabels.map(label => ({
          ...label,
          is_customizable: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      );

      // Insert default code formats
      const defaultFormats = [
        { format_name: 'Default Control Number', format_type: 'control_number', format_template: '{location_prefix}-{batch_prefix}-{sequence:4}', description: 'Default format: PHL-BATCH-0001', is_default: true },
        { format_name: 'Default Passcode', format_type: 'passcode', format_template: '{location_code}-{random:4}', description: 'Default format: 001-1234', is_default: true },
        { format_name: 'Default Batch Number', format_type: 'batch_number', format_template: 'BATCH-{sequence:3}', description: 'Default format: BATCH-001', is_default: true },
      ];

      await supabase.from('code_formats').insert(
        defaultFormats.map(format => ({
          ...format,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      );

    } catch (error) {
      console.error('Settings reset error:', error);
      throw new Error('Failed to reset settings');
    }
  },

  // ============================================================================
  // APPOINTMENT MANAGEMENT OPERATIONS
  // ============================================================================

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async getClinicAppointments(clinicId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    return data as Appointment[];
  },

  async updateAppointmentStatus(appointmentId: string, status: Appointment['status'], respondedBy?: string, response?: string) {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status,
        clinic_response: response,
        responded_by: respondedBy,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async getAllAppointments() {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clinics (
          clinic_name,
          clinic_code
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Appointment[];
  },

  // ============================================================================
  // CLINIC MESSAGING OPERATIONS
  // ============================================================================

  async createClinicMessage(messageData: Omit<ClinicMessage, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('clinic_messages')
      .insert({
        ...messageData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClinicMessage;
  },

  async getClinicMessages(clinicId: string) {
    const { data, error } = await supabase
      .from('clinic_messages')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClinicMessage[];
  },

  async getAllClinicMessages() {
    const { data, error } = await supabase
      .from('clinic_messages')
      .select(`
        *,
        clinics (
          clinic_name,
          clinic_code
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClinicMessage[];
  },

  async updateMessageStatus(messageId: string, status: ClinicMessage['status'], adminResponse?: string, respondedBy?: string) {
    const { data, error } = await supabase
      .from('clinic_messages')
      .update({
        status,
        admin_response: adminResponse,
        admin_responded_by: respondedBy,
        admin_responded_at: adminResponse ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data as ClinicMessage;
  },

  // ============================================================================
  // ENHANCED CARD ACTIVATION WITH E-SIGNATURE
  // ============================================================================

  async activateCardWithSignature(cardId: string, clinicId: string, activatedBy: string, signature: string, notes?: string) {
    // First check if card is assigned to this clinic
    const { data: cardCheck, error: checkError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('clinic_id', clinicId)
      .eq('status', 'assigned')
      .single();

    if (checkError || !cardCheck) {
      throw new Error('Card not found or not assigned to this clinic');
    }

    // Activate the card
    const { data: activatedCard, error: activateError } = await supabase
      .from('cards')
      .update({
        status: 'activated',
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from activation
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .select()
      .single();

    if (activateError) throw activateError;

    // Log the activation with e-signature
    await supabase
      .from('card_activation_logs')
      .insert({
        card_id: cardId,
        clinic_id: clinicId,
        activated_by_name: activatedBy,
        activated_by_signature: signature,
        activation_timestamp: new Date().toISOString(),
        notes: notes,
        created_at: new Date().toISOString(),
      });

    // Log the transaction
    await streamlinedOps.logCardTransaction(cardId, 'activated', activatedBy, {
      activated_by_name: activatedBy,
      activation_clinic: clinicId,
      expires_at: activatedCard.expires_at,
      previous_status: 'assigned',
      signature_captured: true
    });

    return activatedCard as Card;
  },

  async redeemPerkWithSignature(cardId: string, perkId: string, clinicId: string, redeemedBy: string, signature: string, notes?: string) {
    // Get perk details
    const { data: perk, error: perkError } = await supabase
      .from('perks')
      .select('*')
      .eq('id', perkId)
      .single();

    if (perkError || !perk) {
      throw new Error('Perk not found');
    }

    // Check if card is activated and assigned to this clinic
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('clinic_id', clinicId)
      .eq('status', 'activated')
      .single();

    if (cardError || !card) {
      throw new Error('Card not found, not activated, or not assigned to this clinic');
    }

    // Create perk claim
    const { data: claim, error: claimError } = await supabase
      .from('perk_claims')
      .insert({
        card_id: cardId,
        perk_id: perkId,
        clinic_id: clinicId,
        claimed_at: new Date().toISOString(),
        claimed_value: perk.perk_value,
      })
      .select()
      .single();

    if (claimError) throw claimError;

    // Log the redemption with e-signature
    await supabase
      .from('perk_redemption_logs')
      .insert({
        card_id: cardId,
        perk_id: perkId,
        clinic_id: clinicId,
        redeemed_by_name: redeemedBy,
        redeemed_by_signature: signature,
        redemption_value: perk.perk_value,
        redemption_timestamp: new Date().toISOString(),
        notes: notes,
        created_at: new Date().toISOString(),
      });

    // Log the transaction
    await streamlinedOps.logCardTransaction(cardId, 'perk_redeemed', redeemedBy, {
      perk_id: perkId,
      perk_type: perk.perk_type,
      perk_value: perk.perk_value,
      redeemed_by_name: redeemedBy,
      clinic_id: clinicId,
      signature_captured: true
    });

    return claim;
  },

  async getCardActivationLogs(cardId: string) {
    const { data, error } = await supabase
      .from('card_activation_logs')
      .select('*')
      .eq('card_id', cardId)
      .order('activation_timestamp', { ascending: false });

    if (error) throw error;
    return data as CardActivationLog[];
  },

  async getPerkRedemptionLogs(cardId: string) {
    const { data, error } = await supabase
      .from('perk_redemption_logs')
      .select(`
        *,
        perks (
          perk_type,
          description
        )
      `)
      .eq('card_id', cardId)
      .order('redemption_timestamp', { ascending: false });

    if (error) throw error;
    return data as PerkRedemptionLog[];
  },

  // Helper function to get clinic cards
  async getClinicCards(clinicId: string) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        card_batches (
          batch_number
        ),
        perks:clinic_perks!inner (
          perks (
            id,
            perk_type,
            perk_value,
            description
          )
        )
      `)
      .eq('clinic_id', clinicId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data as Card[];
  },

  // Enhanced card lookup with perks (supports both old and new format)
  async lookupCard(controlNumber: string) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        clinics (
          clinic_name,
          clinic_code
        ),
        card_batches (
          batch_number
        ),
        perks:clinic_perks (
          perks (
            id,
            perk_type,
            perk_value,
            description
          )
        )
      `)
      .or(`control_number.eq.${controlNumber},control_number_v2.eq.${controlNumber}`)
      .single();

    if (error) throw error;
    return data as Card;
  },

  // ============================================================================
  // CARD SYSTEM V2 OPERATIONS
  // ============================================================================

  // Get location codes V2 (01-16)
  async getLocationCodesV2(): Promise<LocationCodeV2[]> {
    const { data, error } = await supabase
      .from('location_codes_v2')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (error) throw error;
    return data || [];
  },

  // Get clinic codes by region
  async getClinicCodesByRegion(regionType?: string): Promise<ClinicCodeByRegion[]> {
    let query = supabase
      .from('clinic_codes_by_region')
      .select('*')
      .eq('is_active', true);

    if (regionType) {
      query = query.eq('region_type', regionType);
    }

    const { data, error } = await query.order('clinic_code');

    if (error) throw error;
    return data || [];
  },

  // Generate new control number V2 format
  generateControlNumberV2(cardNumber: number, locationCode?: string, clinicCode?: string): string {
    const formattedNumber = cardNumber.toString().padStart(5, '0');

    if (!locationCode || !clinicCode) {
      return `MOC-__-____-${formattedNumber}`;
    }

    return `MOC-${locationCode}-${clinicCode}-${formattedNumber}`;
  },

  // Generate 10,000 fresh unactivated cards
  async generateFreshCardsV2(totalCards: number = 10000): Promise<boolean> {
    try {
      console.log(`🚀 Generating ${totalCards} fresh unactivated cards...`);

      // Remove existing cards first
      await supabase.from('card_perks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('card_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('card_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const batchSize = 1000;
      const totalBatches = Math.ceil(totalCards / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const startNumber = (batch * batchSize) + 1;
        const endNumber = Math.min((batch + 1) * batchSize, totalCards);

        const cardsToInsert = [];

        for (let cardNumber = startNumber; cardNumber <= endNumber; cardNumber++) {
          const controlNumber = this.generateControlNumberV2(cardNumber);

          cardsToInsert.push({
            control_number_v2: controlNumber,
            control_number: controlNumber, // For backward compatibility
            card_number: cardNumber,
            is_activated: false,
            status: 'unactivated',
            migration_version: 2,
            location_code: 'XX', // Placeholder
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        const { error } = await supabase.from('cards').insert(cardsToInsert);
        if (error) throw error;

        console.log(`✅ Batch ${batch + 1}/${totalBatches} completed (${cardsToInsert.length} cards)`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error generating fresh cards:', error);
      return false;
    }
  },

  // Activate card with new control number format
  async activateCardV2(cardId: string, locationCode: string, clinicCode: string, clinicId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('activate_card_v2', {
        p_card_id: cardId,
        p_location_code: locationCode,
        p_clinic_code: clinicCode,
        p_clinic_id: clinicId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error activating card:', error);
      return false;
    }
  },

  // Get cards V2 with filters
  async getCardsV2(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      activated?: boolean;
      location_code?: string;
      clinic_code?: string;
      search?: string;
    }
  ): Promise<{ cards: Card[], total: number }> {
    try {
      let query = supabase
        .from('cards')
        .select('*', { count: 'exact' })
        .eq('migration_version', 2);

      if (filters) {
        if (filters.activated !== undefined) {
          query = query.eq('is_activated', filters.activated);
        }
        if (filters.location_code) {
          query = query.eq('location_code_v2', filters.location_code);
        }
        if (filters.clinic_code) {
          query = query.eq('clinic_code_v2', filters.clinic_code);
        }
        if (filters.search) {
          query = query.or(`control_number_v2.ilike.%${filters.search}%,card_number.eq.${filters.search}`);
        }
      }

      const { data, error, count } = await query
        .order('card_number', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        cards: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('❌ Error fetching cards V2:', error);
      return { cards: [], total: 0 };
    }
  },

  // Get default perk templates
  async getDefaultPerkTemplates(): Promise<DefaultPerkTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('default_perk_templates')
        .select('*')
        .eq('is_active', true)
        .order('perk_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching perk templates:', error);
      return [];
    }
  },

  // Save perk template (create or update)
  async savePerkTemplate(template: Partial<DefaultPerkTemplate>): Promise<boolean> {
    try {
      if (template.id) {
        // Update existing
        const { error } = await supabase
          .from('default_perk_templates')
          .update({
            ...template,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('default_perk_templates')
          .insert({
            ...template,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('❌ Error saving perk template:', error);
      return false;
    }
  },

  // Delete perk template
  async deletePerkTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('default_perk_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error deleting perk template:', error);
      return false;
    }
  },
};

// Export everything for easy access
export default streamlinedOps;