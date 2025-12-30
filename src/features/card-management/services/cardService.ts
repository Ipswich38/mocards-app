// Card Management Service
// Handles all card-related operations with cloud isolation

import { supabase, supabaseUtils } from '../../../shared/services/supabase';
import {
  Card,
  CardFilters,
  CardUpdateData,
  CardLookupResult,
  CardStatistics,
  CardGenerationRequest,
  CardBatch,
  CardHistory,
  QRCodeData
} from '../types';

class CardManagementService {
  private readonly tableName = 'cards.cards';
  private readonly historyTableName = 'cards.card_history';
  private readonly batchTableName = 'cards.card_batches';

  // Get cards with filtering and pagination
  async getCards(
    filters: CardFilters = {},
    page: number = 1,
    limit: number = 20
  ) {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Apply filters with tenant isolation
      if (filters.clinic_id) {
        query = query.eq('clinic_id', filters.clinic_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,control_number.ilike.%${filters.search}%`);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters.perks_remaining) {
        query = query.gt('perks_total', 'perks_used');
      }

      if (filters.expired) {
        query = query.lt('expiry_date', new Date().toISOString().split('T')[0]);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const response = await query;
      const data = supabaseUtils.handleResponse(response);

      return {
        data,
        count: response.count || 0,
        page,
        limit,
        totalPages: Math.ceil((response.count || 0) / limit)
      };

    } catch (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }
  }

  // Get single card by ID or control number
  async getCard(identifier: string, byControlNumber: boolean = false): Promise<Card | null> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*');

      if (byControlNumber) {
        query = query.eq('control_number', identifier);
      } else {
        query = query.eq('id', identifier);
      }

      const response = await query.single();
      return supabaseUtils.handleResponse(response);

    } catch (error) {
      console.error('Error fetching card:', error);
      return null;
    }
  }

  // Card lookup with comprehensive validation
  async lookupCard(controlNumber: string): Promise<CardLookupResult | null> {
    try {
      const card = await this.getCard(controlNumber, true);

      if (!card) {
        return null;
      }

      const validation_errors: string[] = [];
      let is_valid = true;

      // Check if card is expired
      if (new Date(card.expiry_date) < new Date()) {
        validation_errors.push('Card has expired');
        is_valid = false;
      }

      // Check if card is active
      if (card.status !== 'active') {
        validation_errors.push(`Card status is ${card.status}`);
        is_valid = false;
      }

      // Calculate remaining perks
      const perks_remaining = Math.max(0, card.perks_total - card.perks_used);

      // Log validation attempt
      await this.logCardValidation({
        card_id: card.id,
        validation_type: 'lookup',
        is_valid,
        validation_result: {
          control_number: controlNumber,
          validation_errors,
          perks_remaining
        }
      });

      return {
        card,
        clinic: (card as any).clinic,
        is_valid,
        validation_errors: validation_errors.length > 0 ? validation_errors : undefined,
        perks_remaining
      };

    } catch (error) {
      console.error('Error looking up card:', error);
      throw error;
    }
  }

  // Generate cards in batch
  async generateCards(request: CardGenerationRequest): Promise<CardBatch> {
    try {
      // Create batch record
      const batch: Partial<CardBatch> = {
        clinic_id: request.clinic_id,
        batch_name: `Batch_${Date.now()}`,
        total_cards: request.count,
        generated_cards: 0,
        status: 'pending',
        template_data: request.template_data || {},
        created_by: 'system' // Would be current user in real implementation
      };

      const { data: batchData } = await supabase
        .from(this.batchTableName)
        .insert([batch])
        .select()
        .single();

      if (!batchData) {
        throw new Error('Failed to create batch record');
      }

      // Generate cards (simplified implementation)
      const cards: Partial<Card>[] = [];
      for (let i = 0; i < request.count; i++) {
        const controlNumber = this.generateControlNumber();

        cards.push({
          control_number: controlNumber,
          full_name: `Card Holder ${i + 1}`,
          birth_date: '1990-01-01',
          address: 'Address placeholder',
          contact_number: '09000000000',
          emergency_contact: '09000000001',
          clinic_id: request.clinic_id,
          category_id: request.category_id,
          status: 'active',
          perks_total: 10,
          perks_used: 0,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          qr_code_data: this.generateQRCodeData(controlNumber, request.clinic_id),
          metadata: { batch_id: batchData.id, ...request.template_data }
        });
      }

      // Insert cards in batches
      await supabaseUtils.batchInsert(this.tableName, cards);

      // Update batch status
      await supabase
        .from(this.batchTableName)
        .update({
          generated_cards: request.count,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', batchData.id);

      return { ...batchData, generated_cards: request.count, status: 'completed' } as CardBatch;

    } catch (error) {
      console.error('Error generating cards:', error);
      throw error;
    }
  }

  // Update card
  async updateCard(id: string, updateData: CardUpdateData): Promise<Card> {
    try {
      // Get current card for history
      const currentCard = await this.getCard(id);
      if (!currentCard) {
        throw new Error('Card not found');
      }

      // Update card
      const response = await supabase
        .from(this.tableName)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      const updatedCard = supabaseUtils.handleResponse(response);

      // Log history
      await this.logCardHistory({
        card_id: id,
        control_number: currentCard.control_number,
        action: 'updated',
        old_data: currentCard,
        new_data: updatedCard,
        clinic_id: currentCard.clinic_id,
        notes: 'Card updated via API'
      });

      return updatedCard;

    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    }
  }

  // Update card perks (for redemption)
  async updateCardPerks(controlNumber: string, perksUsed: number): Promise<boolean> {
    try {
      const card = await this.getCard(controlNumber, true);
      if (!card) {
        throw new Error('Card not found');
      }

      if (card.perks_used + perksUsed > card.perks_total) {
        throw new Error('Insufficient perks available');
      }

      await supabase
        .from(this.tableName)
        .update({
          perks_used: card.perks_used + perksUsed,
          updated_at: new Date().toISOString()
        })
        .eq('control_number', controlNumber);

      // Log history
      await this.logCardHistory({
        card_id: card.id,
        control_number: controlNumber,
        action: 'updated',
        old_data: { perks_used: card.perks_used },
        new_data: { perks_used: card.perks_used + perksUsed },
        clinic_id: card.clinic_id,
        notes: `Perk redemption: ${perksUsed} perks used`
      });

      return true;

    } catch (error) {
      console.error('Error updating card perks:', error);
      throw error;
    }
  }

  // Get card statistics
  async getCardStatistics(clinicId?: string): Promise<CardStatistics> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('status, perks_total, perks_used, expiry_date, created_at');

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const response = await query;
      const cards = supabaseUtils.handleResponse(response) || [];

      const stats: CardStatistics = {
        total_cards: cards.length,
        active_cards: cards.filter(c => c.status === 'active').length,
        expired_cards: cards.filter(c => new Date(c.expiry_date) < new Date()).length,
        cards_by_status: {},
        perks_redeemed: cards.reduce((sum, c) => sum + c.perks_used, 0),
        perks_remaining: cards.reduce((sum, c) => sum + (c.perks_total - c.perks_used), 0),
        recent_activations: cards.filter(c => {
          const createdDate = new Date(c.created_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return createdDate > weekAgo;
        }).length,
        cards_expiring_soon: cards.filter(c => {
          const expiryDate = new Date(c.expiry_date);
          const monthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          return expiryDate < monthFromNow && expiryDate > new Date();
        }).length
      };

      // Count by status
      cards.forEach(card => {
        stats.cards_by_status[card.status] = (stats.cards_by_status[card.status] || 0) + 1;
      });

      return stats;

    } catch (error) {
      console.error('Error getting card statistics:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateControlNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MOC${timestamp}${random}`;
  }

  private generateQRCodeData(controlNumber: string, clinicId: string): string {
    const qrData: QRCodeData = {
      control_number: controlNumber,
      clinic_id: clinicId,
      issued_date: new Date().toISOString(),
      expires_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      verification_hash: this.generateVerificationHash(controlNumber, clinicId)
    };

    return JSON.stringify(qrData);
  }

  private generateVerificationHash(controlNumber: string, clinicId: string): string {
    // Simple hash for demo - use proper crypto in production
    return btoa(`${controlNumber}:${clinicId}:${Date.now()}`);
  }

  private async logCardHistory(historyData: Partial<CardHistory>): Promise<void> {
    try {
      await supabase
        .from(this.historyTableName)
        .insert([{
          ...historyData,
          performed_by: 'system', // Would be current user
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.warn('Failed to log card history:', error);
    }
  }

  private async logCardValidation(validationData: any): Promise<void> {
    try {
      await supabase
        .from('cards.card_validations')
        .insert([{
          ...validationData,
          validated_by: 'system', // Would be current user
          clinic_id: 'system', // Would be from context
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.warn('Failed to log card validation:', error);
    }
  }

  // Get card history
  async getCardHistory(cardId: string): Promise<CardHistory[]> {
    try {
      const response = await supabase
        .from(this.historyTableName)
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      return supabaseUtils.handleResponse(response) || [];

    } catch (error) {
      console.error('Error fetching card history:', error);
      return [];
    }
  }

  // Delete card (soft delete by changing status)
  async deleteCard(id: string): Promise<boolean> {
    try {
      const card = await this.getCard(id);
      if (!card) {
        throw new Error('Card not found');
      }

      await supabase
        .from(this.tableName)
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await this.logCardHistory({
        card_id: id,
        control_number: card.control_number,
        action: 'deactivated',
        old_data: { status: card.status },
        new_data: { status: 'inactive' },
        clinic_id: card.clinic_id,
        notes: 'Card deactivated (soft delete)'
      });

      return true;

    } catch (error) {
      console.error('Error deleting card:', error);
      return false;
    }
  }
}

export const cardService = new CardManagementService();