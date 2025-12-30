// Card Management Feature Types
// Centralized type definitions for card management

export interface CardCategory {
  id: string;
  name: string;
  description?: string;
  color_scheme: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

export interface Card {
  id: string;
  control_number: string;
  full_name: string;
  birth_date: string;
  address: string;
  contact_number: string;
  emergency_contact: string;
  clinic_id: string;
  category_id?: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired';
  perks_total: number;
  perks_used: number;
  issue_date: string;
  expiry_date: string;
  qr_code_data?: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface CardHistory {
  id: string;
  card_id: string;
  control_number: string;
  action: 'created' | 'updated' | 'activated' | 'deactivated' | 'expired' | 'transferred';
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  performed_by: string;
  clinic_id: string;
  notes?: string;
  created_at: string;
}

export interface CardExport {
  id: string;
  clinic_id: string;
  export_type: 'csv' | 'xlsx' | 'pdf' | 'json';
  filter_criteria: Record<string, any>;
  total_records: number;
  file_path?: string;
  file_size?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_by: string;
  completed_at?: string;
  expires_at: string;
  created_at: string;
}

export interface CardValidation {
  id: string;
  card_id: string;
  validation_type: 'lookup' | 'qr_scan' | 'manual_verify';
  validated_by: string;
  clinic_id: string;
  ip_address?: string;
  user_agent?: string;
  is_valid: boolean;
  validation_result: Record<string, any>;
  created_at: string;
}

export interface CardGenerationRequest {
  clinic_id: string;
  count: number;
  category_id?: string;
  batch_id?: string;
  template_data?: Record<string, any>;
}

export interface CardBatch {
  id: string;
  clinic_id: string;
  batch_name: string;
  total_cards: number;
  generated_cards: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  template_data: Record<string, any>;
  created_by: string;
  created_at: string;
  completed_at?: string;
}

export interface CardLookupResult {
  card: Card;
  clinic: {
    id: string;
    name: string;
    address: string;
    contact_number: string;
  };
  is_valid: boolean;
  validation_errors?: string[];
  perks_remaining: number;
}

export interface CardFilters {
  clinic_id?: string;
  status?: Card['status'];
  category_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  perks_remaining?: boolean;
  expired?: boolean;
}

export interface CardUpdateData {
  full_name?: string;
  contact_number?: string;
  address?: string;
  emergency_contact?: string;
  status?: Card['status'];
  expiry_date?: string;
  perks_total?: number;
  metadata?: Record<string, any>;
}

export interface QRCodeData {
  control_number: string;
  clinic_id: string;
  issued_date: string;
  expires_date: string;
  verification_hash: string;
}

export interface CardStatistics {
  total_cards: number;
  active_cards: number;
  expired_cards: number;
  cards_by_status: Record<string, number>;
  perks_redeemed: number;
  perks_remaining: number;
  recent_activations: number;
  cards_expiring_soon: number;
}