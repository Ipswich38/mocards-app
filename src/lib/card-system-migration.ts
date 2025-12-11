// Card System V2.0 Migration and Generation
// Handles migration from old system to new MOC format

import { createClient } from '@supabase/supabase-js';

// Note: This should use your actual Supabase credentials
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'your-supabase-url',
  process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key'
);

export interface LocationCodeV2 {
  id: string;
  code: string; // 01-16
  region_name: string;
  description: string;
  is_active: boolean;
}

export interface ClinicCodeByRegion {
  id: string;
  clinic_code: string; // 4-digit code
  region_type: 'visayas' | 'luzon_4a' | 'ncr';
  region_name: string;
  location_code: string;
  description: string;
  is_active: boolean;
}

export interface CardV2 {
  id: string;
  control_number_v2: string; // MOC-XX-XXXX-NNNNN format
  location_code_v2?: string;
  clinic_code_v2?: string;
  card_number: number; // 1-10000+
  is_activated: boolean;
  activated_at?: string;
  activated_by_clinic_id?: string;
  status: 'unactivated' | 'activated' | 'suspended' | 'expired';
  migration_version: number;
}

export interface DefaultPerkTemplate {
  id: string;
  perk_name: string;
  perk_type: 'discount' | 'cashback' | 'freebie' | 'points';
  perk_value: number;
  description: string;
  is_active: boolean;
  is_default: boolean;
}

class CardSystemMigration {

  // Step 1: Remove all existing cards and batches
  async removeAllExistingCards(): Promise<boolean> {
    try {
      console.log('🗑️ Removing all existing cards and batches...');

      // Delete all card perks first (foreign key constraint)
      await supabase.from('card_perks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete all transactions
      await supabase.from('card_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete all cards
      await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete all batches
      await supabase.from('card_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      console.log('✅ All existing cards and batches removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error removing existing cards:', error);
      return false;
    }
  }

  // Step 2: Generate new control number format
  generateControlNumberV2(cardNumber: number, locationCode?: string, clinicCode?: string): string {
    const formattedNumber = cardNumber.toString().padStart(5, '0');

    if (!locationCode || !clinicCode) {
      // Return blank format for unactivated cards
      return `MOC-__-____-${formattedNumber}`;
    }

    return `MOC-${locationCode}-${clinicCode}-${formattedNumber}`;
  }

  // Step 3: Generate 10,000 fresh unactivated cards
  async generateFreshCards(totalCards: number = 10000): Promise<boolean> {
    try {
      console.log(`🚀 Generating ${totalCards} fresh unactivated cards...`);

      const batchSize = 1000; // Process in batches for performance
      const totalBatches = Math.ceil(totalCards / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const startNumber = (batch * batchSize) + 1;
        const endNumber = Math.min((batch + 1) * batchSize, totalCards);

        console.log(`📦 Processing batch ${batch + 1}/${totalBatches} (cards ${startNumber}-${endNumber})`);

        const cardsToInsert = [];

        for (let cardNumber = startNumber; cardNumber <= endNumber; cardNumber++) {
          const controlNumber = this.generateControlNumberV2(cardNumber);

          cardsToInsert.push({
            control_number_v2: controlNumber,
            card_number: cardNumber,
            is_activated: false,
            status: 'unactivated',
            migration_version: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        const { error } = await supabase.from('cards').insert(cardsToInsert);

        if (error) {
          throw error;
        }

        console.log(`✅ Batch ${batch + 1} completed (${cardsToInsert.length} cards)`);
      }

      console.log(`🎉 Successfully generated ${totalCards} fresh unactivated cards!`);
      return true;
    } catch (error) {
      console.error('❌ Error generating fresh cards:', error);
      return false;
    }
  }

  // Step 4: Get location codes
  async getLocationCodes(): Promise<LocationCodeV2[]> {
    try {
      const { data, error } = await supabase
        .from('location_codes_v2')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching location codes:', error);
      return [];
    }
  }

  // Step 5: Get clinic codes by region
  async getClinicCodesByRegion(regionType?: string): Promise<ClinicCodeByRegion[]> {
    try {
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
    } catch (error) {
      console.error('❌ Error fetching clinic codes:', error);
      return [];
    }
  }

  // Step 6: Activate card with new control number
  async activateCard(cardId: string, locationCode: string, clinicCode: string, clinicId: string): Promise<boolean> {
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
  }

  // Step 7: Get default perk templates
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
  }

  // Step 8: Create or update perk template
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
  }

  // Step 9: Delete perk template
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
  }

  // Step 10: Get cards with filters
  async getCards(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      activated?: boolean;
      location_code?: string;
      clinic_code?: string;
      search?: string;
    }
  ): Promise<{ cards: CardV2[], total: number }> {
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
      console.error('❌ Error fetching cards:', error);
      return { cards: [], total: 0 };
    }
  }

  // Complete migration process
  async runCompleteMigration(): Promise<boolean> {
    try {
      console.log('🚀 Starting complete card system migration...');

      // Step 1: Remove existing cards
      const removed = await this.removeAllExistingCards();
      if (!removed) {
        throw new Error('Failed to remove existing cards');
      }

      // Step 2: Generate fresh cards
      const generated = await this.generateFreshCards(10000);
      if (!generated) {
        throw new Error('Failed to generate fresh cards');
      }

      console.log('🎉 Complete migration finished successfully!');
      console.log('📋 Summary:');
      console.log('   • Removed all existing cards and data');
      console.log('   • Generated 10,000 fresh unactivated cards');
      console.log('   • Cards format: MOC-__-____-00001 to MOC-__-____-10000');
      console.log('   • Ready for clinic activation workflow');

      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
  }
}

export default CardSystemMigration;