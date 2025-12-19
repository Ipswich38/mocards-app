// MOCARDS CLOUD - Clean Data Layer
export type ClinicPlan = 'starter' | 'growth' | 'pro';

export interface CardData {
  controlNumber: string; // Format: MOC-{ID}-{REGION}-{CODE}
  fullName: string;
  status: 'active' | 'inactive';
  perksTotal: number;
  perksUsed: number;
  clinicId: string;
  expiryDate: string; // ISO Date
}

export interface Clinic {
  id: string;
  name: string;
  region: string;
  plan: ClinicPlan;
  code: string;
  address?: string; // Optional
  adminClinic?: string; // Optional
  email?: string; // Optional
  contactNumber?: string; // Optional
  password: string; // For clinic login
  subscriptionPrice: number; // Monthly price in PHP
}

export interface Appointment {
  id: string;
  cardControlNumber: string;
  clinicId: string;
  patientName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Plan Limits and Pricing (Monthly PHP)
export const PLAN_LIMITS = {
  starter: 500,
  growth: 1000,
  pro: 2000,
} as const;

export const PLAN_PRICING = {
  starter: 299, // ₱299 for up to 500 cards
  growth: 499,  // ₱499 for up to 1000 cards
  pro: 799,     // ₱799 for up to 2000 cards
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
  'CVT001', 'CVT002', 'CVT003', 'CVT004', 'CVT005',
  'CVT006', 'CVT007', 'CVT008', 'CVT009', 'CVT010',
  'BTG001', 'BTG002', 'BTG003', 'BTG004', 'BTG005',
  'BTG006', 'BTG007', 'BTG008', 'BTG009', 'BTG010',
  'LGN001', 'LGN002', 'LGN003', 'LGN004', 'LGN005',
  'LGN006', 'LGN007', 'LGN008', 'LGN009', 'LGN010',
  'Others',
  'Custom'
] as const;

// Mock Database
let cards: CardData[] = [
  {
    controlNumber: 'MOC-00001-01-CVT001',
    fullName: 'Juan Dela Cruz',
    status: 'active',
    perksTotal: 5,
    perksUsed: 2,
    clinicId: '1',
    expiryDate: '2025-12-31',
  },
  {
    controlNumber: 'MOC-00002-NCR-CVT002',
    fullName: 'Maria Santos',
    status: 'active',
    perksTotal: 3,
    perksUsed: 1,
    clinicId: '2',
    expiryDate: '2025-11-30',
  },
  {
    controlNumber: 'MOC-00003-4A-CVT003',
    fullName: 'Jose Rodriguez',
    status: 'inactive',
    perksTotal: 4,
    perksUsed: 0,
    clinicId: '1',
    expiryDate: '2025-10-15',
  },
];

let clinics: Clinic[] = [
  {
    id: '1',
    name: 'Central Valley Clinic',
    region: 'NCR',
    plan: 'growth',
    code: 'CVT001',
    address: 'Makati City, Metro Manila',
    email: 'admin@centralvalley.com',
    contactNumber: '+63917123456',
    password: 'cvt001pass',
    subscriptionPrice: PLAN_PRICING.growth,
  },
  {
    id: '2',
    name: 'Manila General Hospital',
    region: 'NCR',
    plan: 'pro',
    code: 'CVT002',
    address: 'Manila City, Metro Manila',
    email: 'contact@mgh.ph',
    contactNumber: '+63917234567',
    password: 'cvt002pass',
    subscriptionPrice: PLAN_PRICING.pro,
  },
  {
    id: '3',
    name: 'Laguna Medical Center',
    region: '4A',
    plan: 'starter',
    code: 'CVT003',
    address: 'Santa Rosa, Laguna',
    email: 'info@lmc.ph',
    contactNumber: '+63917345678',
    password: 'cvt003pass',
    subscriptionPrice: PLAN_PRICING.starter,
  },
];

let appointments: Appointment[] = [];

// Utility Functions
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-PH');
};

export const generateControlNumber = (id: number, region: string, areaCode: string): string => {
  const paddedId = id.toString().padStart(5, '0');
  return `MOC-${paddedId}-${region}-${areaCode}`;
};

export const generateClinicCode = (areaCode: string): string => {
  const existingCodes = clinics.map(c => c.code);
  let counter = 1;

  // If custom or others, use CVT prefix
  if (areaCode === 'Custom' || areaCode === 'Others') {
    while (existingCodes.includes(`CVT${counter.toString().padStart(3, '0')}`)) {
      counter++;
    }
    return `CVT${counter.toString().padStart(3, '0')}`;
  }

  // Use the selected area code
  return areaCode;
};

// Card Operations
export const cardOperations = {
  getAll: (): CardData[] => cards,

  getByControlNumber: (controlNumber: string): CardData | null => {
    return cards.find(card => card.controlNumber === controlNumber) || null;
  },

  getByClinicId: (clinicId: string): CardData[] => {
    return cards.filter(card => card.clinicId === clinicId);
  },

  create: (card: CardData): CardData => {
    cards.push(card);
    return card;
  },

  createBatch: (
    startId: number,
    endId: number,
    region: string,
    areaCode: string
  ): CardData[] => {
    const newCards: CardData[] = [];
    for (let i = startId; i <= endId; i++) {
      const card: CardData = {
        controlNumber: generateControlNumber(i, region, areaCode),
        fullName: `Patient ${i}`,
        status: 'inactive',
        perksTotal: 5,
        perksUsed: 0,
        clinicId: '',
        expiryDate: '2025-12-31',
      };
      cards.push(card);
      newCards.push(card);
    }
    return newCards;
  },

  updateStatus: (controlNumber: string, status: 'active' | 'inactive'): boolean => {
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      card.status = status;
      return true;
    }
    return false;
  },

  assignToClinic: (controlNumbers: string[], clinicId: string): boolean => {
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return false;

    // Check plan limits
    const currentAssigned = cards.filter(c => c.clinicId === clinicId).length;
    const limit = PLAN_LIMITS[clinic.plan];

    if (currentAssigned + controlNumbers.length > limit) {
      return false; // Exceeds plan limit
    }

    // Assign cards
    controlNumbers.forEach(controlNumber => {
      const card = cards.find(c => c.controlNumber === controlNumber);
      if (card) {
        card.clinicId = clinicId;
      }
    });

    return true;
  },

  updatePerks: (controlNumber: string, perksUsed: number): boolean => {
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      card.perksUsed = Math.min(perksUsed, card.perksTotal);
      return true;
    }
    return false;
  },

  delete: (controlNumber: string): boolean => {
    const index = cards.findIndex(c => c.controlNumber === controlNumber);
    if (index !== -1) {
      cards.splice(index, 1);
      return true;
    }
    return false;
  },
};

// Clinic Operations
export const clinicOperations = {
  getAll: (): Clinic[] => clinics,

  getById: (id: string): Clinic | null => {
    return clinics.find(clinic => clinic.id === id) || null;
  },

  getByCode: (code: string): Clinic | null => {
    return clinics.find(clinic => clinic.code === code) || null;
  },

  authenticate: (code: string, password: string): Clinic | null => {
    return clinics.find(clinic =>
      clinic.code === code && clinic.password === password
    ) || null;
  },

  create: (clinic: Omit<Clinic, 'id'>): Clinic => {
    const newClinic: Clinic = {
      ...clinic,
      id: (clinics.length + 1).toString(),
    };
    clinics.push(newClinic);
    return newClinic;
  },

  update: (id: string, updates: Partial<Clinic>): boolean => {
    const index = clinics.findIndex(c => c.id === id);
    if (index !== -1) {
      clinics[index] = { ...clinics[index], ...updates };
      return true;
    }
    return false;
  },

  delete: (id: string): boolean => {
    const index = clinics.findIndex(c => c.id === id);
    if (index !== -1) {
      clinics.splice(index, 1);
      return true;
    }
    return false;
  },

  getAssignedCardsCount: (clinicId: string): number => {
    return cards.filter(card => card.clinicId === clinicId).length;
  },

  getPlanLimit: (clinicId: string): number => {
    const clinic = clinics.find(c => c.id === clinicId);
    return clinic ? PLAN_LIMITS[clinic.plan] : 0;
  },
};

// Appointment Operations
export const appointmentOperations = {
  getAll: (): Appointment[] => appointments,

  getByClinicId: (clinicId: string): Appointment[] => {
    return appointments.filter(apt => apt.clinicId === clinicId);
  },

  create: (appointment: Omit<Appointment, 'id'>): Appointment => {
    const newAppointment: Appointment = {
      ...appointment,
      id: (appointments.length + 1).toString(),
    };
    appointments.push(newAppointment);
    return newAppointment;
  },

  updateStatus: (id: string, status: Appointment['status']): boolean => {
    const appointment = appointments.find(a => a.id === id);
    if (appointment) {
      appointment.status = status;
      return true;
    }
    return false;
  },
};