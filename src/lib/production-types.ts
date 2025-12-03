// Enhanced types for production MOCARDS system

export interface ProductionClinic {
  id: string;
  clinic_code: string;
  clinic_name: string;
  password_hash: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  status: string;
  business_license?: string;
  owner_name?: string;
  subscription_plan: 'basic' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'expired';
  monthly_card_limit: number;
  cards_issued_this_month: number;
  last_login_at?: string;
  is_active: boolean;
  commission_rate: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  plan_name: string;
  monthly_card_limit: number;
  price_per_month: number;
  commission_rate: number;
  features: {
    analytics: boolean;
    custom_branding: boolean;
    priority_support: boolean;
  };
  is_active: boolean;
  created_at: string;
}

export interface ClinicSale {
  id: string;
  clinic_id: string;
  card_id: string;
  sale_amount: number;
  commission_amount: number;
  payment_method?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  sale_date: string;
  status: 'completed' | 'pending' | 'refunded';
}

export interface PerkRedemption {
  id: string;
  clinic_id: string;
  card_id: string;
  perk_id: string;
  service_provided?: string;
  service_value?: number;
  redeemed_at: string;
  notes?: string;
}

export interface MonthlyReport {
  id: string;
  clinic_id: string;
  report_month: number;
  report_year: number;
  cards_sold: number;
  cards_activated: number;
  perks_redeemed: number;
  total_revenue: number;
  commission_paid: number;
  generated_at: string;
}

export interface CreateClinicData {
  clinic_name: string;
  owner_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  business_license?: string;
  subscription_plan?: 'basic' | 'professional' | 'enterprise';
}

export interface ClinicDashboardStats {
  totalCards: number;
  activeCards: number;
  monthlyActivations: number;
  totalRevenue: number;
  monthlyRevenue: number;
  perksRedeemed: number;
  monthlyPerksRedeemed: number;
  remainingCardLimit: number;
}

export interface CardActivationData {
  control_number: string;
  passcode: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  sale_amount?: number;
  payment_method?: string;
}

export interface PerkRedemptionData {
  card_id: string;
  perk_id: string;
  service_provided?: string;
  service_value?: number;
  notes?: string;
}