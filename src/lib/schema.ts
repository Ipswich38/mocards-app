// MOCARDS CLOUD - Unified Database Schema
// Central schema file for all data types, interfaces, and constants
// Version: 1.0.0 - Initial unified schema

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export type ClinicPlan = 'starter' | 'growth' | 'pro' | 'enterprise';
export type CardStatus = 'active' | 'inactive';
export type AppointmentStatus = 'pending' | 'accepted' | 'declined' | 'rescheduled' | 'completed' | 'cancelled';
export type UserRole = 'admin' | 'clinic' | 'staff';
export type PerkType = 'dental_cleaning' | 'consultation' | 'xray' | 'treatment' | 'discount' | 'extraction' | 'filling' | 'fluoride' | 'checkup';

// ============================================================================
// CORE INTERFACES
// ============================================================================

// Card Schema
export interface Card {
  id: string;
  controlNumber: string; // Format: MOC-{ID}-{REGION}-{CODE}
  fullName: string;
  status: CardStatus;
  perksTotal: number;
  perksUsed: number;
  clinicId: string;
  expiryDate: string; // ISO Date
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  issuedBy?: string; // Admin ID who issued the card
  activatedAt?: string; // ISO Date when activated
  deactivatedAt?: string; // ISO Date when deactivated
  notes?: string; // Additional notes
}

// Clinic Schema
export interface Clinic {
  id: string;
  name: string;
  username: string; // Username for clinic portal login
  region: string;
  plan: ClinicPlan;
  code: string; // Unique clinic code
  address?: string;
  adminClinic?: string; // Admin contact person
  email?: string;
  contactNumber?: string;
  password: string; // For clinic portal login
  subscriptionPrice: number; // Monthly price in PHP
  subscriptionStatus: 'active' | 'suspended' | 'cancelled';
  subscriptionStartDate: string; // ISO Date
  subscriptionEndDate?: string; // ISO Date
  maxCards: number; // Based on plan
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  lastPaymentDate?: string; // ISO Date
  nextBillingDate?: string; // ISO Date
  isActive: boolean;
}

// Appointment Schema - Updated for real implementation
export interface Appointment {
  id: string;
  cardControlNumber: string;
  clinicId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  preferredDate: string; // ISO Date - matches actual implementation
  preferredTime: string; // HH:MM format
  serviceType: string;
  perkRequested?: string; // Perk that patient wants to use
  status: AppointmentStatus;
  notes?: string; // Admin/clinic notes
  createdAt: string; // ISO Date
  updatedAt?: string; // ISO Date
  completedAt?: string; // ISO Date when marked complete
  cancelledAt?: string; // ISO Date when cancelled
  cancellationReason?: string;
  processedBy?: string; // Clinic staff who processed
  processedAt?: string; // When clinic processed the request
}

// Perk Schema
export interface Perk {
  id: string;
  type: PerkType;
  name: string;
  description: string;
  value: number; // Value in PHP or percentage
  isActive: boolean;
  validFor: number; // Days valid
  requiresApproval: boolean;
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
}

// Perk Usage Schema (Legacy - for backward compatibility)
export interface PerkUsage {
  id: string;
  cardControlNumber: string;
  perkId: string;
  clinicId: string;
  usedAt: string; // ISO Date
  value: number; // Actual value used
  approvedBy?: string; // Staff ID who approved
  notes?: string;
}

// Perk Redemption Schema - Current implementation for tracking
export interface PerkRedemption {
  id: string;
  cardControlNumber: string;
  perkId: string;
  perkName: string; // For easy display without lookup
  clinicId: string;
  claimantName: string; // Patient name who claimed
  handledBy: string; // Clinic staff who processed
  serviceType: string; // What service was provided
  usedAt: string; // ISO Date timestamp
  value: number; // Value of the perk in PHP
  notes?: string; // Additional notes
}

// User Schema (Admin, Clinic Staff)
export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // Hashed
  role: UserRole;
  clinicId?: string; // For clinic staff
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: string; // ISO Date
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  permissions: string[]; // Array of permission strings
}

// Payment Schema
export interface Payment {
  id: string;
  clinicId: string;
  amount: number; // Amount in PHP
  currency: 'PHP';
  paymentMethod: 'gcash' | 'bank_transfer' | 'credit_card' | 'cash';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  paidAt?: string; // ISO Date
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  notes?: string;
  receiptUrl?: string;
}

// Audit Log Schema
export interface AuditLog {
  id: string;
  userId: string;
  action: string; // What action was performed
  resource: string; // What was changed (card, clinic, etc.)
  resourceId: string; // ID of the changed resource
  oldValues?: Record<string, any>; // Previous values
  newValues?: Record<string, any>; // New values
  ipAddress?: string;
  userAgent?: string;
  createdAt: string; // ISO Date
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Plan Limits and Pricing (Monthly PHP)
export const PLAN_CONFIG = {
  starter: {
    limit: 500,
    price: 299,
    name: 'Starter Plan',
    features: ['Up to 500 cards', 'Basic reporting', 'Email support']
  },
  growth: {
    limit: 1000,
    price: 499,
    name: 'Growth Plan',
    features: ['Up to 1,000 cards', 'Advanced reporting', 'Priority support', 'Custom perks']
  },
  pro: {
    limit: 2000,
    price: 799,
    name: 'Pro Plan',
    features: ['Up to 2,000 cards', 'Full analytics', '24/7 support', 'API access', 'Custom branding']
  },
  enterprise: {
    limit: 3000,
    price: 999,
    name: 'Enterprise Plan',
    features: ['Up to 3,000 cards', 'Enterprise analytics', 'Dedicated support', 'White-label solution', 'Custom integrations']
  }
} as const;

// Legacy constants for backward compatibility
export const PLAN_LIMITS = {
  starter: PLAN_CONFIG.starter.limit,
  growth: PLAN_CONFIG.growth.limit,
  pro: PLAN_CONFIG.pro.limit,
  enterprise: PLAN_CONFIG.enterprise.limit,
} as const;

export const PLAN_PRICING = {
  starter: PLAN_CONFIG.starter.price,
  growth: PLAN_CONFIG.growth.price,
  pro: PLAN_CONFIG.pro.price,
  enterprise: PLAN_CONFIG.enterprise.price,
} as const;

// Philippines Regions for MOC Cards
export const PHILIPPINES_REGIONS = [
  { code: '01', name: 'Ilocos Region (Region 1)' },
  { code: '02', name: 'Cagayan Valley (Region 2)' },
  { code: '03', name: 'Central Luzon (Region 3)' },
  { code: '4A', name: 'Calabarzon (Region 4A)' },
  { code: '4B', name: 'Mimaropa (Region 4B)' },
  { code: '05', name: 'Bicol Region (Region 5)' },
  { code: '06', name: 'Western Visayas (Region 6)' },
  { code: '07', name: 'Central Visayas (Region 7)' },
  { code: '08', name: 'Eastern Visayas (Region 8)' },
  { code: '09', name: 'Zamboanga Peninsula (Region 9)' },
  { code: '10', name: 'Northern Mindanao (Region 10)' },
  { code: '11', name: 'Davao Region (Region 11)' },
  { code: '12', name: 'Soccsksargen (Region 12)' },
  { code: '13', name: 'Caraga Region (Region 13)' },
  { code: 'NCR', name: 'National Capital Region (NCR)' },
  { code: 'CAR', name: 'Cordillera Administrative Region (CAR)' },
] as const;

// Area Codes for Major Cities and Provinces
export const AREA_CODES = [
  // Central Valley Codes
  'CVT001', 'CVT002', 'CVT003', 'CVT004', 'CVT005',
  'CVT006', 'CVT007', 'CVT008', 'CVT009', 'CVT010',
  // Batangas Codes
  'BTG001', 'BTG002', 'BTG003', 'BTG004', 'BTG005',
  'BTG006', 'BTG007', 'BTG008', 'BTG009', 'BTG010',
  // Laguna Codes
  'LGN001', 'LGN002', 'LGN003', 'LGN004', 'LGN005',
  'LGN006', 'LGN007', 'LGN008', 'LGN009', 'LGN010',
  // Special Codes
  'Others',
  'Custom'
] as const;

// Production Default Perks - Christmas 2025 Edition
export const DEFAULT_PERKS: Omit<Perk, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'dental_cleaning',
    name: 'Free Dental Cleaning',
    description: 'Complete professional dental cleaning service',
    value: 1500, // PHP value
    isActive: true,
    validFor: 365,
    requiresApproval: false
  },
  {
    type: 'consultation',
    name: 'Free Dental Consultation',
    description: 'Comprehensive dental consultation and check-up',
    value: 500, // PHP value
    isActive: true,
    validFor: 365,
    requiresApproval: false
  },
  {
    type: 'xray',
    name: 'X-Ray Imaging Service',
    description: 'Digital X-ray imaging for diagnosis',
    value: 800, // PHP value
    isActive: true,
    validFor: 365,
    requiresApproval: true
  },
  {
    type: 'treatment',
    name: 'Treatment Discount',
    description: '20% discount on dental treatments and procedures',
    value: 20, // Percentage value
    isActive: true,
    validFor: 365,
    requiresApproval: true
  },
  {
    type: 'discount',
    name: 'General Service Discount',
    description: '10% discount on all dental services',
    value: 10, // Percentage value
    isActive: true,
    validFor: 365,
    requiresApproval: false
  }
];

// Production Application Settings
export const APP_CONFIG = {
  name: 'MOCARDS CLOUD',
  version: '4.0.0',
  tagline: 'Dental Benefits Platform',
  currency: 'PHP',
  timezone: 'Asia/Manila',
  dateFormat: 'en-PH',
  supportEmail: 'admin@mocards.cloud',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  cardExpiryMonths: 12, // Default card expiry
  backupFrequency: 'daily',
  auditRetentionDays: 365,

  // Production sync settings
  sync: {
    appointmentRealTime: true,
    perkRedemptionTracking: true,
    cardStatusUpdates: true,
    crossPortalPermissions: true
  },

  // Feature flags for production
  features: {
    adminPortal: true,
    clinicPortal: true,
    cardLookup: true,
    perkRedemption: true,
    appointmentManagement: true,
    realTimeSync: true,
    historyTracking: true,
    securityDashboard: true,
    mobileOptimized: true,
    pwaSupport: true
  }
} as const;

// Production API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  version: string;
  requestId?: string;

  // Production metadata
  metadata?: {
    syncStatus?: 'real-time' | 'cached' | 'stale';
    lastSync?: string;
    source?: 'admin' | 'clinic' | 'system';
    performance?: {
      queryTime: number;
      cacheHit: boolean;
    };
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Production Search and Filter Types
export interface SearchFilters {
  query?: string;
  status?: CardStatus | AppointmentStatus;
  clinicId?: string;
  region?: string;
  plan?: ClinicPlan;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Advanced filters
  cardControlNumber?: string;
  perkType?: PerkType;
  handledBy?: string;
  serviceType?: string;
  claimantName?: string;
  hasRedemptions?: boolean;
  expiringIn?: number; // days

  // Sync filters
  syncStatus?: 'synced' | 'pending' | 'failed';
  lastUpdated?: string;
}

// Production Dashboard Stats Types
export interface DashboardStats {
  // Card metrics
  totalCards: number;
  activeCards: number;
  inactiveCards: number;
  cardsAssignedToday: number;

  // Clinic metrics
  totalClinics: number;
  activeClinics: number;
  clinicsCreatedToday: number;

  // Appointment metrics
  totalAppointments: number;
  pendingAppointments: number;
  acceptedAppointments: number;
  completedAppointments: number;
  appointmentsToday: number;

  // Financial metrics
  monthlyRevenue: number;
  totalRevenue: number;
  avgRevenuePerClinic: number;

  // Perk metrics
  totalPerkRedemptions: number;
  perkRedemptionsToday: number;
  totalPerkValue: number;
  mostUsedPerk: string;

  // Sync metrics
  lastSyncTime: string;
  syncErrors: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

// Export legacy types for backward compatibility
export type CardData = Card;
export type { Clinic as ClinicData };
export type { Appointment as AppointmentData };

// Production Type Exports - fixed conflicts

// Smart Sync Types for Admin-Clinic Integration
export interface AdminClinicSync {
  // Appointment sync between admin portal and clinic portal
  appointmentSync: {
    fromCardLookup: (appointment: Omit<Appointment, 'id'>) => Promise<Appointment>;
    fromAdminPortal: (appointment: Omit<Appointment, 'id'>) => Promise<Appointment>;
    toClinicPortal: (clinicId: string) => Promise<Appointment[]>;
  };

  // Card assignment and activation sync
  cardSync: {
    assignToClinic: (cardNumbers: string[], clinicId: string) => Promise<boolean>;
    updateStatus: (cardNumber: string, status: CardStatus) => Promise<boolean>;
    syncPerksUsage: (cardNumber: string, perksUsed: number) => Promise<boolean>;
  };

  // Perk redemption tracking sync
  perkSync: {
    redeemPerk: (redemption: any) => Promise<any>;
    getHistory: (cardNumber: string) => Promise<any[]>;
    validateRedemption: (cardNumber: string, perkId: string) => Promise<boolean>;
  };

  // Real-time notifications
  notifications: {
    notifyClinicNewAppointment: (clinicId: string, appointment: Appointment) => void;
    notifyAdminPerkRedemption: (redemption: any) => void;
    notifyCardStatusChange: (cardNumber: string, status: CardStatus) => void;
  };
}

// Clinic Portal Permission System
export interface ClinicPermissions {
  canManageCards: boolean;
  canViewAppointments: boolean;
  canProcessAppointments: boolean;
  canRedeemPerks: boolean;
  canViewReports: boolean;
  canManageStaff: boolean;
}

// Admin Portal Features
export interface AdminFeatures {
  canCreateClinics: boolean;
  canManageClinics: boolean;
  canGenerateCards: boolean;
  canManagePerks: boolean;
  canViewAllAppointments: boolean;
  canAccessReports: boolean;
  canManageSystem: boolean;
}

// Cross-Portal Sync Configuration
export interface SyncConfiguration {
  appointments: {
    autoSyncToClinic: boolean;
    notifyClinicOnNew: boolean;
    allowClinicEdit: boolean;
  };
  cards: {
    autoActivateOnAssign: boolean;
    syncStatusChanges: boolean;
  };
  perks: {
    syncRedemptionsRealTime: boolean;
    trackRedemptionHistory: boolean;
    requireStaffDetails: boolean;
  };
}

// Production Data Validation Rules
export const VALIDATION_RULES = {
  card: {
    controlNumber: /^MOC-\d{5}-[A-Z0-9]{2,3}-[A-Z0-9]{3,6}$/,
    minPerks: 1,
    maxPerks: 10,
    expiryMinDays: 30
  },
  clinic: {
    codeFormat: /^[A-Z]{3}\d{3}$/,
    minPassword: 8,
    maxCards: {
      starter: 500,
      growth: 1000,
      pro: 2000
    }
  },
  appointment: {
    minAdvanceDays: 0,
    maxAdvanceDays: 90,
    requiredFields: ['patientName', 'patientEmail', 'preferredDate', 'serviceType']
  },
  perkRedemption: {
    requiredFields: ['claimantName', 'handledBy', 'serviceType'],
    maxNotesLength: 500
  }
} as const;

// Schema Version for migrations
export const SCHEMA_VERSION = '4.0.0';
export const SCHEMA_UPDATED_AT = '2025-12-24T00:00:00.000Z';
export const PRODUCTION_READY = true;
export const CHRISTMAS_EVE_DEADLINE_VERSION = 'v4.0-christmas-2025';