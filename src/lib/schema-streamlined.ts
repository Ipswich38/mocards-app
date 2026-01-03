// MOCARDS CLOUD - STREAMLINED APPLICATION SCHEMA
// Version: 5.0.0 - Fresh Start, No Complexities
// Matches: supabase/schema-streamlined-fresh.sql
// Focus: Core features only - Simple, Clean, Production-ready

// ============================================================================
// CORE TYPES - SIMPLIFIED
// ============================================================================

export type CardStatus = 'active' | 'inactive';
export type AppointmentStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type ClinicPlan = 'starter' | 'growth' | 'pro';

// ============================================================================
// STREAMLINED INTERFACES
// ============================================================================

// Region Interface
export interface Region {
  code: string;
  name: string;
  sort_order: number;
}

// Clinic Code Interface
export interface ClinicCode {
  code: string;
  region_code: string;
  description: string;
  sort_order: number;
}

// Clinic Interface - Simplified
export interface Clinic {
  id: string;
  clinic_name: string;
  clinic_code: string;
  region: string;
  password_hash: string;
  plan: ClinicPlan;
  max_cards: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Card Interface - Streamlined
export interface Card {
  id: string;
  control_number: string;
  unified_control_number?: string;
  card_number?: number;
  cardholder_name?: string;
  status: CardStatus;
  assigned_clinic_id?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;

  // Virtual fields from joins
  clinic_name?: string;
  clinic_code?: string;
  perks?: CardPerk[];
}

// Card Perk Interface - Simple
export interface CardPerk {
  id: string;
  card_id: string;
  perk_type: string;
  claimed: boolean;
  claimed_at?: string;
  claimed_by_clinic?: string;
  created_at: string;
}

// Appointment Interface - Clean
export interface Appointment {
  id: string;
  control_number: string;
  passcode?: string;
  cardholder_name: string;
  cardholder_phone?: string;
  cardholder_email?: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  assigned_clinic_id?: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Perk Redemption Interface - Simple Tracking
export interface PerkRedemption {
  id: string;
  card_control_number: string;
  perk_id: string;
  perk_name: string;
  clinic_id: string;
  claimant_name: string;
  handled_by: string;
  service_type: string;
  used_at: string;
  perk_value: number;
  notes?: string;
}

// ============================================================================
// CONSTANTS - COMPLETE & ACCURATE
// ============================================================================

// All Philippines Regions (Including 4B + Custom)
export const PHILIPPINES_REGIONS: Region[] = [
  { code: '01', name: 'Ilocos Region (Region 1)', sort_order: 1 },
  { code: '02', name: 'Cagayan Valley (Region 2)', sort_order: 2 },
  { code: '03', name: 'Central Luzon (Region 3)', sort_order: 3 },
  { code: '4A', name: 'Calabarzon (Region 4A)', sort_order: 4 },
  { code: '4B', name: 'Mimaropa (Region 4B)', sort_order: 5 },
  { code: '05', name: 'Bicol Region (Region 5)', sort_order: 6 },
  { code: '06', name: 'Western Visayas (Region 6)', sort_order: 7 },
  { code: '07', name: 'Central Visayas (Region 7)', sort_order: 8 },
  { code: '08', name: 'Eastern Visayas (Region 8)', sort_order: 9 },
  { code: '09', name: 'Zamboanga Peninsula (Region 9)', sort_order: 10 },
  { code: '10', name: 'Northern Mindanao (Region 10)', sort_order: 11 },
  { code: '11', name: 'Davao Region (Region 11)', sort_order: 12 },
  { code: '12', name: 'Soccsksargen (Region 12)', sort_order: 13 },
  { code: '13', name: 'Caraga Region (Region 13)', sort_order: 14 },
  { code: 'NCR', name: 'National Capital Region (NCR)', sort_order: 15 },
  { code: 'CAR', name: 'Cordillera Administrative Region (CAR)', sort_order: 16 },
  { code: 'CUSTOM', name: 'Custom Region', sort_order: 17 },
];

// Complete Clinic Codes (001-016 ranges + specials)
export const AREA_CODES: string[] = [
  // Central Valley Codes (CVT001 to CVT016)
  'CVT001', 'CVT002', 'CVT003', 'CVT004', 'CVT005', 'CVT006', 'CVT007', 'CVT008',
  'CVT009', 'CVT010', 'CVT011', 'CVT012', 'CVT013', 'CVT014', 'CVT015', 'CVT016',

  // Batangas Codes (BTG001 to BTG016)
  'BTG001', 'BTG002', 'BTG003', 'BTG004', 'BTG005', 'BTG006', 'BTG007', 'BTG008',
  'BTG009', 'BTG010', 'BTG011', 'BTG012', 'BTG013', 'BTG014', 'BTG015', 'BTG016',

  // Laguna Codes (LGN001 to LGN016)
  'LGN001', 'LGN002', 'LGN003', 'LGN004', 'LGN005', 'LGN006', 'LGN007', 'LGN008',
  'LGN009', 'LGN010', 'LGN011', 'LGN012', 'LGN013', 'LGN014', 'LGN015', 'LGN016',

  // MIMAROPA Codes (MIM001 to MIM016)
  'MIM001', 'MIM002', 'MIM003', 'MIM004', 'MIM005', 'MIM006', 'MIM007', 'MIM008',
  'MIM009', 'MIM010', 'MIM011', 'MIM012', 'MIM013', 'MIM014', 'MIM015', 'MIM016',

  // Special Codes
  'Others',
  'Custom'
];

// Plan Configuration - Simple
export const PLAN_LIMITS: Record<ClinicPlan, number> = {
  starter: 500,
  growth: 1000,
  pro: 2000,
};

// Default Perks - Simple List
export const DEFAULT_PERKS: string[] = [
  'Free Dental Cleaning',
  'Free Consultation',
  'X-Ray Service',
  'Treatment Discount',
  'General Discount'
];

// ============================================================================
// STREAMLINED APP CONFIGURATION
// ============================================================================

export const APP_CONFIG = {
  name: 'MOCARDS CLOUD',
  version: '5.0.0',
  tagline: 'Dental Benefits Platform - Streamlined',

  // Core Features Only
  features: {
    cardLookup: true,
    clinicPortal: true,
    adminPortal: true,
    perkRedemption: true,
    appointments: true,
    realTimeSync: true,
  },

  // Cloud-Native Settings
  cloud: {
    stateless: true,
    realTimeUpdates: true,
    autoBackup: true,
    simpleAuth: true,
  },

  // Business Rules
  defaultCardExpiry: 365, // days
  defaultPerksPerCard: 5,
  maxCardsPerClinic: {
    starter: 500,
    growth: 1000,
    pro: 2000,
  }
} as const;

// ============================================================================
// UTILITY FUNCTIONS - SIMPLIFIED
// ============================================================================

// Generate control number
export function generateControlNumber(id: number, region: string, areaCode: string): string {
  const paddedId = id.toString().padStart(5, '0');
  return `MOC-${paddedId}-${region}-${areaCode}`;
}

// Validate control number format
export function isValidControlNumber(controlNumber: string): boolean {
  const pattern = /^MOC-\d{5}-[A-Z0-9]{1,6}-[A-Z0-9]{3,10}$/;
  return pattern.test(controlNumber);
}

// Get region name by code
export function getRegionName(code: string): string {
  const region = PHILIPPINES_REGIONS.find(r => r.code === code);
  return region?.name || 'Unknown Region';
}

// Get clinic codes by region
export function getClinicCodesByRegion(regionCode: string): string[] {
  if (regionCode === '4A') {
    return AREA_CODES.filter(code =>
      code.startsWith('CVT') || code.startsWith('BTG') || code.startsWith('LGN')
    );
  }
  if (regionCode === '4B') {
    return AREA_CODES.filter(code => code.startsWith('MIM'));
  }
  if (regionCode === 'CUSTOM') {
    return ['Others', 'Custom'];
  }
  return ['Others']; // Default for other regions
}

// Calculate card expiry date
export function calculateExpiryDate(createdAt: string): string {
  const created = new Date(createdAt);
  const expiry = new Date(created);
  expiry.setDate(expiry.getDate() + APP_CONFIG.defaultCardExpiry);
  return expiry.toISOString();
}

// ============================================================================
// API RESPONSE TYPES - SIMPLIFIED
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchFilters {
  query?: string;
  status?: CardStatus | AppointmentStatus;
  clinicId?: string;
  region?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// LEGACY TYPE EXPORTS FOR COMPATIBILITY
// ============================================================================

export type CardData = Card;
export type ClinicData = Clinic;
export type AppointmentData = Appointment;

// Schema version for migrations
export const SCHEMA_VERSION = '5.0.0';
export const SCHEMA_DESCRIPTION = 'Streamlined Fresh Start - No Complexities';
export const SCHEMA_DATE = '2025-01-03';

// Export all for easy importing
export default {
  PHILIPPINES_REGIONS,
  AREA_CODES,
  PLAN_LIMITS,
  DEFAULT_PERKS,
  APP_CONFIG,
  generateControlNumber,
  isValidControlNumber,
  getRegionName,
  getClinicCodesByRegion,
  calculateExpiryDate
};