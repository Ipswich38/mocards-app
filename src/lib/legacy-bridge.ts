// Legacy Bridge for Immediate Production Compatibility
// This ensures existing code works while we migrate to new architecture

import { supabase } from '../shared/services/supabase';

// Bridge to make existing data operations work with both old and new schema
export const legacyBridge = {
  // Ensure backward compatibility for clinic operations
  async getClinic(identifier: string, byCode: boolean = false) {
    try {
      // Try new schema first
      let query = supabase
        .from('app_clinics.clinics')
        .select('*');

      if (byCode) {
        query = query.eq('code', identifier);
      } else {
        query = query.eq('id', identifier);
      }

      const { data, error } = await query.single();

      if (!error && data) {
        return data;
      }

      // Fallback to old schema if new schema fails
      console.log('Falling back to legacy schema...');
      const legacyQuery = supabase
        .from('clinics')
        .select('*');

      if (byCode) {
        legacyQuery.eq('code', identifier);
      } else {
        legacyQuery.eq('id', identifier);
      }

      const { data: legacyData, error: legacyError } = await legacyQuery.single();
      return legacyError ? null : legacyData;

    } catch (error) {
      console.error('Bridge error:', error);
      return null;
    }
  },

  // Bridge for card operations
  async getCards(filters: any = {}) {
    try {
      // Try new schema first
      let query = supabase
        .from('app_cards.cards')
        .select('*');

      if (filters.clinic_id) {
        query = query.eq('clinic_id', filters.clinic_id);
      }

      const { data, error } = await query;

      if (!error && data) {
        return { data, count: data.length };
      }

      // Fallback to old schema
      console.log('Falling back to legacy cards schema...');
      const legacyQuery = supabase
        .from('cards')
        .select('*');

      if (filters.clinic_id) {
        legacyQuery.eq('clinic_id', filters.clinic_id);
      }

      const { data: legacyData, error: legacyError } = await legacyQuery;
      return legacyError ? { data: [], count: 0 } : { data: legacyData || [], count: legacyData?.length || 0 };

    } catch (error) {
      console.error('Bridge error:', error);
      return { data: [], count: 0 };
    }
  },

  // Bridge for appointments
  async getAppointments(clinicId?: string) {
    try {
      // Try new schema first
      let query = supabase
        .from('appointments')
        .select('*');

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data, error } = await query;

      if (!error) {
        return data || [];
      }

      // Return empty array if no table exists yet
      return [];

    } catch (error) {
      console.error('Bridge error:', error);
      return [];
    }
  }
};

// Export for immediate use
export default legacyBridge;