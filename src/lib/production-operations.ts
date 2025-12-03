import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import type {
  ProductionClinic,
  SubscriptionPlan,
  CreateClinicData,
  ClinicSale,
  PerkRedemption,
  MonthlyReport,
  ClinicDashboardStats,
  CardActivationData,
  PerkRedemptionData
} from './production-types';

export const productionOperations = {
  // Admin operations for clinic management
  async createClinic(clinicData: CreateClinicData) {
    try {
      // Generate unique clinic code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('generate_clinic_code');

      if (codeError) throw codeError;
      const clinicCode = codeResult;

      // Generate secure password
      const { data: passwordResult, error: passwordError } = await supabase
        .rpc('generate_clinic_password');

      if (passwordError) throw passwordError;
      const plainPassword = passwordResult;

      // Hash the password
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // Get subscription plan details
      const { data: planData, error: planError } = await supabase
        .from('clinic_subscription_plans')
        .select('*')
        .eq('plan_name', clinicData.subscription_plan || 'basic')
        .single();

      if (planError) throw planError;

      // Create clinic record
      const { data: clinic, error: clinicError } = await supabase
        .from('mocards_clinics')
        .insert({
          clinic_code: clinicCode,
          clinic_name: clinicData.clinic_name,
          password_hash: hashedPassword,
          contact_email: clinicData.contact_email,
          contact_phone: clinicData.contact_phone,
          address: clinicData.address,
          business_license: clinicData.business_license,
          owner_name: clinicData.owner_name,
          subscription_plan: clinicData.subscription_plan || 'basic',
          monthly_card_limit: planData.monthly_card_limit,
          commission_rate: planData.commission_rate,
          status: 'active'
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      return {
        clinic: clinic as ProductionClinic,
        credentials: {
          clinic_code: clinicCode,
          password: plainPassword
        }
      };
    } catch (error) {
      console.error('Error creating clinic:', error);
      throw error;
    }
  },

  async getAllClinics() {
    const { data, error } = await supabase
      .from('mocards_clinics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ProductionClinic[];
  },

  async updateClinicStatus(clinicId: string, status: 'active' | 'suspended' | 'inactive') {
    const { data, error } = await supabase
      .from('mocards_clinics')
      .update({
        status,
        is_active: status === 'active'
      })
      .eq('id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return data as ProductionClinic;
  },

  async getSubscriptionPlans() {
    const { data, error } = await supabase
      .from('clinic_subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_per_month');

    if (error) throw error;
    return data as SubscriptionPlan[];
  },

  // Clinic dashboard operations
  async getClinicDashboardStats(clinicId: string): Promise<ClinicDashboardStats> {
    try {
      // Get clinic info
      const { data: clinic, error: clinicError } = await supabase
        .from('mocards_clinics')
        .select('monthly_card_limit, cards_issued_this_month, total_revenue')
        .eq('id', clinicId)
        .single();

      if (clinicError) throw clinicError;

      // Get total cards assigned to clinic
      const { data: totalCards, error: totalCardsError } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_clinic_id', clinicId);

      if (totalCardsError) throw totalCardsError;

      // Get active cards
      const { data: activeCards, error: activeCardsError } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_clinic_id', clinicId)
        .eq('status', 'activated');

      if (activeCardsError) throw activeCardsError;

      // Get this month's activations
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyActivations, error: monthlyActivationsError } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_clinic_id', clinicId)
        .eq('status', 'activated')
        .gte('activated_at', startOfMonth.toISOString());

      if (monthlyActivationsError) throw monthlyActivationsError;

      // Get monthly revenue
      const { data: monthlyRevenue, error: monthlyRevenueError } = await supabase
        .from('clinic_sales')
        .select('sale_amount')
        .eq('clinic_id', clinicId)
        .gte('sale_date', startOfMonth.toISOString());

      if (monthlyRevenueError) throw monthlyRevenueError;

      // Get total perks redeemed
      const { data: perksRedeemed, error: perksRedeemedError } = await supabase
        .from('clinic_perk_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);

      if (perksRedeemedError) throw perksRedeemedError;

      // Get monthly perks redeemed
      const { data: monthlyPerksRedeemed, error: monthlyPerksRedeemedError } = await supabase
        .from('clinic_perk_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('redeemed_at', startOfMonth.toISOString());

      if (monthlyPerksRedeemedError) throw monthlyPerksRedeemedError;

      const monthlyRevenueTotal = monthlyRevenue?.reduce((sum, sale) => sum + (sale.sale_amount || 0), 0) || 0;

      return {
        totalCards: totalCards?.length || 0,
        activeCards: activeCards?.length || 0,
        monthlyActivations: monthlyActivations?.length || 0,
        totalRevenue: clinic.total_revenue || 0,
        monthlyRevenue: monthlyRevenueTotal,
        perksRedeemed: perksRedeemed?.length || 0,
        monthlyPerksRedeemed: monthlyPerksRedeemed?.length || 0,
        remainingCardLimit: (clinic.monthly_card_limit || 0) - (clinic.cards_issued_this_month || 0)
      };
    } catch (error) {
      console.error('Error getting clinic dashboard stats:', error);
      throw error;
    }
  },

  async activateCardForClinic(clinicId: string, activationData: CardActivationData) {
    try {
      // Find the card
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('control_number', activationData.control_number)
        .eq('passcode', activationData.passcode)
        .single();

      if (cardError) throw cardError;
      if (!card) throw new Error('Card not found');
      if (card.status !== 'unactivated') throw new Error('Card is already activated');

      // Check clinic monthly limit
      const { data: clinic, error: clinicError } = await supabase
        .from('mocards_clinics')
        .select('monthly_card_limit, cards_issued_this_month')
        .eq('id', clinicId)
        .single();

      if (clinicError) throw clinicError;
      if (clinic.cards_issued_this_month >= clinic.monthly_card_limit) {
        throw new Error('Monthly card activation limit reached');
      }

      // Activate the card
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { data: activatedCard, error: activationError } = await supabase
        .from('cards')
        .update({
          status: 'activated',
          assigned_clinic_id: clinicId,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id)
        .select()
        .single();

      if (activationError) throw activationError;

      // Record the sale if sale amount provided
      let saleRecord = null;
      if (activationData.sale_amount && activationData.sale_amount > 0) {
        const commissionRate = clinic.commission_rate || 10;
        const commissionAmount = (activationData.sale_amount * commissionRate) / 100;

        const { data: sale, error: saleError } = await supabase
          .from('clinic_sales')
          .insert({
            clinic_id: clinicId,
            card_id: card.id,
            sale_amount: activationData.sale_amount,
            commission_amount: commissionAmount,
            payment_method: activationData.payment_method,
            customer_name: activationData.customer_name,
            customer_phone: activationData.customer_phone,
            customer_email: activationData.customer_email,
            status: 'completed'
          })
          .select()
          .single();

        if (saleError) throw saleError;
        saleRecord = sale;

        // Update clinic total revenue
        await supabase
          .from('mocards_clinics')
          .update({
            total_revenue: (clinic.total_revenue || 0) + activationData.sale_amount
          })
          .eq('id', clinicId);
      }

      // Log transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: card.id,
          transaction_type: 'activated',
          performed_by: 'clinic',
          performed_by_id: clinicId,
          details: {
            clinic_id: clinicId,
            customer_name: activationData.customer_name,
            sale_amount: activationData.sale_amount
          }
        });

      return {
        card: activatedCard,
        sale: saleRecord
      };
    } catch (error) {
      console.error('Error activating card:', error);
      throw error;
    }
  },

  async redeemPerkForClinic(clinicId: string, redemptionData: PerkRedemptionData) {
    try {
      // Check if perk exists and is not claimed
      const { data: perk, error: perkError } = await supabase
        .from('card_perks')
        .select('*')
        .eq('id', redemptionData.perk_id)
        .eq('claimed', false)
        .single();

      if (perkError) throw perkError;
      if (!perk) throw new Error('Perk not found or already claimed');

      // Check if card belongs to this clinic
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('assigned_clinic_id')
        .eq('id', redemptionData.card_id)
        .single();

      if (cardError) throw cardError;
      if (card.assigned_clinic_id !== clinicId) throw new Error('Card not assigned to this clinic');

      // Mark perk as claimed
      const { data: claimedPerk, error: claimError } = await supabase
        .from('card_perks')
        .update({
          claimed: true,
          claimed_at: new Date().toISOString(),
          claimed_by_clinic: clinicId
        })
        .eq('id', redemptionData.perk_id)
        .select()
        .single();

      if (claimError) throw claimError;

      // Record the redemption
      const { data: redemption, error: redemptionError } = await supabase
        .from('clinic_perk_redemptions')
        .insert({
          clinic_id: clinicId,
          card_id: redemptionData.card_id,
          perk_id: redemptionData.perk_id,
          service_provided: redemptionData.service_provided,
          service_value: redemptionData.service_value,
          notes: redemptionData.notes
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      // Log transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: redemptionData.card_id,
          transaction_type: 'perk_claimed',
          performed_by: 'clinic',
          performed_by_id: clinicId,
          details: {
            perk_type: perk.perk_type,
            service_provided: redemptionData.service_provided,
            service_value: redemptionData.service_value
          }
        });

      return {
        perk: claimedPerk,
        redemption
      };
    } catch (error) {
      console.error('Error redeeming perk:', error);
      throw error;
    }
  },

  async getClinicCards(clinicId: string) {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        perks:card_perks(*)
      `)
      .eq('assigned_clinic_id', clinicId)
      .order('activated_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getClinicSales(clinicId: string, limit = 50) {
    const { data, error } = await supabase
      .from('clinic_sales')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('sale_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ClinicSale[];
  },

  async getClinicPerkRedemptions(clinicId: string, limit = 50) {
    const { data, error } = await supabase
      .from('clinic_perk_redemptions')
      .select(`
        *,
        card:cards(control_number),
        perk:card_perks(perk_type)
      `)
      .eq('clinic_id', clinicId)
      .order('redeemed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};