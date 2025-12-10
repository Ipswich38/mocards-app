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
      const { data, error } = await supabase
        .rpc('generate_control_number', {
          batch_prefix: batchNumber,
          sequence_number: sequenceNumber + attempt,
          location_prefix: 'PHL'
        });

      if (error) throw error;

      const controlNumber = data as string;

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
      const { data, error } = await supabase
        .rpc('generate_passcode', {
          location_code: locationCode
        });

      if (error) throw error;

      const passcode = data as string;

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
  }
};

// Export everything for easy access
export default streamlinedOps;