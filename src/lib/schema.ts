// MOCARDS CLOUD - Unified Database Schema
// Central schema file for all data types, interfaces, and constants
// Version: 1.0.0 - Initial unified schema

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export type ClinicPlan = 'starter' | 'growth' | 'pro';
export type CardStatus = 'active' | 'inactive';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type UserRole = 'admin' | 'clinic' | 'staff';
export type PerkType = 'dental_cleaning' | 'consultation' | 'xray' | 'treatment' | 'discount';

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

// Appointment Schema
export interface Appointment {
  id: string;
  cardControlNumber: string;
  clinicId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  date: string; // ISO Date
  time: string; // HH:MM format
  status: AppointmentStatus;
  serviceType: string;
  notes?: string;
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  completedAt?: string; // ISO Date when marked complete
  cancelledAt?: string; // ISO Date when cancelled
  cancellationReason?: string;
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

// Perk Usage Schema
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
  }
} as const;

// Legacy constants for backward compatibility
export const PLAN_LIMITS = {
  starter: PLAN_CONFIG.starter.limit,
  growth: PLAN_CONFIG.growth.limit,
  pro: PLAN_CONFIG.pro.limit,
} as const;

export const PLAN_PRICING = {
  starter: PLAN_CONFIG.starter.price,
  growth: PLAN_CONFIG.growth.price,
  pro: PLAN_CONFIG.pro.price,
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

// Default Perks
export const DEFAULT_PERKS: Omit<Perk, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'dental_cleaning',
    name: 'Free Dental Cleaning',
    description: 'Complete dental cleaning service',
    value: 0,
    isActive: true,
    validFor: 365,
    requiresApproval: false
  },
  {
    type: 'consultation',
    name: 'Free Consultation',
    description: 'General dental consultation',
    value: 0,
    isActive: true,
    validFor: 365,
    requiresApproval: false
  },
  {
    type: 'xray',
    name: 'X-Ray Discount',
    description: '50% discount on X-ray services',
    value: 50,
    isActive: true,
    validFor: 365,
    requiresApproval: true
  },
  {
    type: 'treatment',
    name: 'Treatment Discount',
    description: '20% discount on dental treatments',
    value: 20,
    isActive: true,
    validFor: 365,
    requiresApproval: true
  },
  {
    type: 'discount',
    name: 'General Discount',
    description: '10% discount on all services',
    value: 10,
    isActive: true,
    validFor: 365,
    requiresApproval: false
  }
];

// Application Settings
export const APP_CONFIG = {
  name: 'MOCARDS CLOUD',
  version: '1.0.0',
  currency: 'PHP',
  timezone: 'Asia/Manila',
  dateFormat: 'en-PH',
  supportEmail: 'support@mocardscloud.com',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  cardExpiryMonths: 12, // Default card expiry
  backupFrequency: 'daily',
  auditRetentionDays: 365
} as const;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and Filter Types
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
}

// Dashboard Stats Types
export interface DashboardStats {
  totalCards: number;
  activeCards: number;
  inactiveCards: number;
  totalClinics: number;
  activeClinics: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  monthlyRevenue: number;
  perkUsageCount: number;
}

// Export legacy types for backward compatibility
export type CardData = Card;
export { Clinic as ClinicData };
export { Appointment as AppointmentData };

// Schema Version for migrations
export const SCHEMA_VERSION = '1.0.0';
export const SCHEMA_UPDATED_AT = '2025-12-19T00:00:00.000Z';