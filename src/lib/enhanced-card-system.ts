import { supabase } from './supabase';
import type { Card, CardBatch } from './supabase';

// Enhanced card types for production system
export interface EnhancedCardData {
  id: string;
  batch_id: string;
  control_number: string;
  incomplete_passcode: string; // Only the 4-digit part (___XXXX format)
  complete_passcode?: string; // Full passcode after clinic assigns location
  location_code: string;
  status: 'unactivated' | 'location_pending' | 'activated' | 'expired';
  assigned_clinic_id?: string;
  activated_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  batch_number?: string;
  card_metadata: {
    batch_creation_date: string;
    card_position_in_batch: number;
    total_perks_count: number;
    initial_perks: string[];
    validity_period_months: number;
  };
}

export interface EnhancedCardBatch {
  id: string;
  batch_number: string;
  total_cards: number;
  cards_generated: number;
  created_by: string;
  batch_status: 'generating' | 'completed' | 'distributed';
  batch_metadata: {
    generation_timestamp: string;
    admin_user: string;
    intended_distribution: string;
    expiry_period: number;
  };
  created_at: string;
}

export interface LocationCodeAssignment {
  clinic_id: string;
  card_id: string;
  location_code: string; // 3-character code (e.g., "CAV", "MNL", "CEB")
  assigned_at: string;
  assigned_by: string;
}

export const enhancedCardSystem = {

  // Generate enhanced card batches with metadata
  async createEnhancedCardBatch(
    adminUserId: string,
    totalCards: number = 10,
    distributionPlan?: string
  ): Promise<{ batch: EnhancedCardBatch; cards: EnhancedCardData[] }> {
    try {
      // Generate unique batch number with timestamp
      const timestamp = Date.now();
      const batchNumber = `MOB-${timestamp.toString().slice(-8)}`;

      // Create batch record with metadata
      const { data: batch, error: batchError } = await supabase
        .from('card_batches')
        .insert({
          batch_number: batchNumber,
          total_cards: totalCards,
          created_by: adminUserId,
          batch_status: 'generating',
          batch_metadata: {
            generation_timestamp: new Date().toISOString(),
            admin_user: adminUserId,
            intended_distribution: distributionPlan || 'general',
            expiry_period: 12 // 12 months validity
          }
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const generatedCards: EnhancedCardData[] = [];

      // Generate cards with enhanced metadata
      for (let i = 1; i <= totalCards; i++) {
        const controlNumber = `MOC-${timestamp.toString().slice(-8)}-${i.toString().padStart(3, '0')}`;

        // Generate incomplete passcode (4 digits only, location to be added later)
        const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');

        const cardMetadata = {
          batch_creation_date: new Date().toISOString(),
          card_position_in_batch: i,
          total_perks_count: 8,
          initial_perks: [
            'consultation',
            'cleaning',
            'extraction',
            'fluoride',
            'whitening',
            'xray',
            'denture',
            'braces'
          ],
          validity_period_months: 12
        };

        const { data: card, error: cardError } = await supabase
          .from('cards')
          .insert({
            batch_id: batch.id,
            control_number: controlNumber,
            passcode: incompletePasscode, // Store just the 4-digit code
            location_code: 'PHL', // Default Philippines
            status: 'unactivated' // Use existing status
          })
          .select()
          .single();

        if (cardError) throw cardError;

        // Create default perks for each card
        const perkTypes = cardMetadata.initial_perks;
        for (const perkType of perkTypes) {
          await supabase
            .from('card_perks')
            .insert({
              card_id: card.id,
              perk_type: perkType,
              claimed: false
            });
        }

        // Log card creation transaction
        await supabase
          .from('card_transactions')
          .insert({
            card_id: card.id,
            transaction_type: 'created',
            performed_by: 'admin',
            performed_by_id: adminUserId,
            details: {
              batch_number: batchNumber,
              card_position: i,
              incomplete_passcode: incompletePasscode
            }
          });

        generatedCards.push({
          ...card,
          incomplete_passcode: incompletePasscode,
          batch_number: batchNumber,
          card_metadata: cardMetadata
        } as EnhancedCardData);
      }

      // Update batch status to completed
      await supabase
        .from('card_batches')
        .update({
          batch_status: 'completed',
          cards_generated: totalCards
        })
        .eq('id', batch.id);

      return {
        batch: { ...batch, cards_generated: totalCards } as EnhancedCardBatch,
        cards: generatedCards
      };

    } catch (error) {
      console.error('Error creating enhanced card batch:', error);
      throw error;
    }
  },

  // Assign location code to card (clinic process)
  async assignLocationCodeToCard(
    clinicId: string,
    cardId: string,
    locationCode: string // e.g., "CAV" for Cavite
  ): Promise<{ card: EnhancedCardData; completePasscode: string }> {
    try {
      // Validate location code (must be 3 characters)
      if (!locationCode || locationCode.length !== 3) {
        throw new Error('Location code must be exactly 3 characters (e.g., CAV, MNL, CEB)');
      }

      const locationCodeUpper = locationCode.toUpperCase();

      // Get card with incomplete passcode
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .eq('status', 'unactivated')
        .single();

      if (cardError) throw cardError;
      if (!card) throw new Error('Card not found or already has location assigned');

      // The passcode is already just the 4-digit part
      const incompletePasscode = card.passcode;
      const completePasscode = `${locationCodeUpper}${incompletePasscode}`;

      // Update card with complete passcode and location
      const { data: updatedCard, error: updateError } = await supabase
        .from('cards')
        .update({
          passcode: completePasscode,
          location_code: locationCodeUpper,
          status: 'unactivated', // Ready for activation
          assigned_clinic_id: clinicId,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Record location assignment
      await supabase
        .from('clinic_sales') // We can reuse this table or create a new one
        .insert({
          clinic_id: clinicId,
          card_id: cardId,
          sale_amount: 0, // No sale yet, just assignment
          commission_amount: 0,
          payment_method: 'assignment',
          status: 'location_assigned'
        });

      // Log transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: cardId,
          transaction_type: 'location_assigned',
          performed_by: 'clinic',
          performed_by_id: clinicId,
          details: {
            location_code: locationCodeUpper,
            complete_passcode: completePasscode,
            previous_status: 'location_pending'
          }
        });

      return {
        card: updatedCard as EnhancedCardData,
        completePasscode
      };

    } catch (error) {
      console.error('Error assigning location code:', error);
      throw error;
    }
  },

  // Get pending cards for clinic (cards that need location assignment)
  async getPendingCardsForClinic(limit: number = 50): Promise<EnhancedCardData[]> {
    try {
      const { data: cards, error } = await supabase
        .from('cards')
        .select(`
          *,
          batch:card_batches(batch_number)
        `)
        .eq('status', 'unactivated')
        .is('assigned_clinic_id', null)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return cards?.map(card => ({
        ...card,
        incomplete_passcode: card.passcode,
        batch_number: card.batch?.batch_number
      })) as EnhancedCardData[] || [];

    } catch (error) {
      console.error('Error getting pending cards:', error);
      throw error;
    }
  },

  // Activate card with location code (enhanced activation)
  async activateEnhancedCard(
    clinicId: string,
    controlNumber: string,
    completePasscode: string, // e.g., "CAV1234"
    customerInfo?: {
      name?: string;
      phone?: string;
      email?: string;
    },
    saleAmount?: number
  ) {
    try {
      // Find card with complete passcode
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('control_number', controlNumber)
        .eq('passcode', completePasscode)
        .eq('assigned_clinic_id', clinicId)
        .eq('status', 'unactivated')
        .single();

      if (cardError) throw cardError;
      if (!card) throw new Error('Card not found, incorrect passcode, or not assigned to this clinic');

      // Activate card with 1-year validity
      const activatedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(activatedAt.getFullYear() + 1);

      const { data: activatedCard, error: activationError } = await supabase
        .from('cards')
        .update({
          status: 'activated',
          activated_at: activatedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id)
        .select()
        .single();

      if (activationError) throw activationError;

      // Record sale if amount provided
      let saleRecord = null;
      if (saleAmount && saleAmount > 0) {
        // Get clinic commission rate
        const { data: clinic } = await supabase
          .from('mocards_clinics')
          .select('commission_rate')
          .eq('id', clinicId)
          .single();

        const commissionRate = clinic?.commission_rate || 10;
        const commissionAmount = (saleAmount * commissionRate) / 100;

        const { data: sale, error: saleError } = await supabase
          .from('clinic_sales')
          .insert({
            clinic_id: clinicId,
            card_id: card.id,
            sale_amount: saleAmount,
            commission_amount: commissionAmount,
            customer_name: customerInfo?.name,
            customer_phone: customerInfo?.phone,
            customer_email: customerInfo?.email,
            payment_method: 'cash', // Default
            status: 'completed'
          })
          .select()
          .single();

        if (saleError) throw saleError;
        saleRecord = sale;
      }

      // Log activation transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: card.id,
          transaction_type: 'activated',
          performed_by: 'clinic',
          performed_by_id: clinicId,
          details: {
            customer_info: customerInfo,
            sale_amount: saleAmount,
            activation_date: activatedAt.toISOString(),
            expiry_date: expiresAt.toISOString(),
            location_code: card.location_code
          }
        });

      return {
        card: activatedCard,
        sale: saleRecord
      };

    } catch (error) {
      console.error('Error activating enhanced card:', error);
      throw error;
    }
  },

  // Get batch statistics
  async getBatchStatistics(batchId: string) {
    try {
      const { data: cards } = await supabase
        .from('cards')
        .select('status')
        .eq('batch_id', batchId);

      const stats = cards?.reduce((acc, card) => {
        acc[card.status] = (acc[card.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        total: cards?.length || 0,
        location_pending: stats.location_pending || 0,
        unactivated: stats.unactivated || 0,
        activated: stats.activated || 0,
        expired: stats.expired || 0
      };

    } catch (error) {
      console.error('Error getting batch statistics:', error);
      throw error;
    }
  }
};