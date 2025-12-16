// MOCARDS CLOUD - Data Layer
export type ClinicPlan = 'starter' | 'growth' | 'pro';

export interface Clinic {
  id: string;
  name: string;
  region: string;
  code: string;
  plan: ClinicPlan;
  address: string;
  createdAt: string;
}

export interface CardData {
  controlNumber: string;
  fullName: string;
  status: 'active' | 'inactive';
  clinicId: string;
  clinicName: string;
  perksTotal: number;
  perksUsed: number;
  expiryDate: string;
  type: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  cardControlNumber: string;
  date: string;
  time: string;
  clinicId: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Plan Limits
export const PLAN_LIMITS: Record<ClinicPlan, number> = {
  starter: 500,
  growth: 1000,
  pro: 2000,
};

// Region Codes
export const REGIONS = [
  { code: '01', name: 'NCR - National Capital Region' },
  { code: '02', name: 'CAR - Cordillera Administrative Region' },
  { code: '03', name: 'Ilocos Region' },
  { code: '04', name: 'Cagayan Valley' },
  { code: '05', name: 'Central Luzon' },
  { code: '06', name: 'Bicol Region' },
  { code: '07', name: 'Western Visayas' },
  { code: '08', name: 'Central Visayas' },
  { code: '09', name: 'Eastern Visayas' },
  { code: '10', name: 'Zamboanga Peninsula' },
  { code: '11', name: 'Northern Mindanao' },
  { code: '12', name: 'Davao Region' },
  { code: '13', name: 'SOCCSKSARGEN' },
  { code: '14', name: 'ARMM' },
  { code: '15', name: 'CARAGA' },
  { code: '16', name: 'MIMAROPA' },
];

// Area Codes
export const AREA_CODES = ['CVT', 'DEN', 'MED', 'SUR', 'ORT', 'PED', 'GYN', 'CAR', 'NEU', 'PSY'];

// Mock Data Storage
let clinics: Clinic[] = [
  {
    id: '1',
    name: 'Smile Dental Clinic',
    region: 'NCR',
    code: 'CVT001',
    plan: 'starter',
    address: 'Makati City, Metro Manila',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Health Plus Medical Center',
    region: 'Central Luzon',
    code: 'MED002',
    plan: 'growth',
    address: 'Angeles City, Pampanga',
    createdAt: '2024-02-10',
  },
  {
    id: '3',
    name: 'Premier Dental Care',
    region: 'Central Visayas',
    code: 'DEN003',
    plan: 'pro',
    address: 'Cebu City, Cebu',
    createdAt: '2024-03-05',
  },
];

let cards: CardData[] = [
  {
    controlNumber: 'MOC-00001-01-CVT001',
    fullName: 'Juan Dela Cruz',
    status: 'active',
    clinicId: '1',
    clinicName: 'Smile Dental Clinic',
    perksTotal: 5,
    perksUsed: 2,
    expiryDate: '2025-12-31',
    type: 'Premium',
    createdAt: '2024-01-16',
  },
  {
    controlNumber: 'MOC-00002-01-CVT001',
    fullName: 'Maria Santos',
    status: 'active',
    clinicId: '1',
    clinicName: 'Smile Dental Clinic',
    perksTotal: 5,
    perksUsed: 1,
    expiryDate: '2025-12-31',
    type: 'Premium',
    createdAt: '2024-01-17',
  },
  {
    controlNumber: 'MOC-00003-05-MED002',
    fullName: 'Jose Garcia',
    status: 'inactive',
    clinicId: '2',
    clinicName: 'Health Plus Medical Center',
    perksTotal: 8,
    perksUsed: 0,
    expiryDate: '2025-12-31',
    type: 'Platinum',
    createdAt: '2024-02-11',
  },
  {
    controlNumber: 'MOC-00004-08-DEN003',
    fullName: 'Ana Rodriguez',
    status: 'active',
    clinicId: '3',
    clinicName: 'Premier Dental Care',
    perksTotal: 10,
    perksUsed: 3,
    expiryDate: '2025-12-31',
    type: 'Diamond',
    createdAt: '2024-03-06',
  },
  {
    controlNumber: 'MOC-00005-01-CVT001',
    fullName: 'Carlos Mendoza',
    status: 'inactive',
    clinicId: '1',
    clinicName: 'Smile Dental Clinic',
    perksTotal: 5,
    perksUsed: 0,
    expiryDate: '2025-12-31',
    type: 'Premium',
    createdAt: '2024-01-18',
  },
];

let appointments: Appointment[] = [
  {
    id: '1',
    patientName: 'Juan Dela Cruz',
    cardControlNumber: 'MOC-00001-01-CVT001',
    date: '2024-12-20',
    time: '10:00',
    clinicId: '1',
    status: 'scheduled',
  },
  {
    id: '2',
    patientName: 'Maria Santos',
    cardControlNumber: 'MOC-00002-01-CVT001',
    date: '2024-12-21',
    time: '14:30',
    clinicId: '1',
    status: 'scheduled',
  },
];

// CRUD Operations for Clinics
export const clinicOperations = {
  getAll: (): Clinic[] => clinics,

  getById: (id: string): Clinic | undefined =>
    clinics.find(clinic => clinic.id === id),

  create: (clinic: Omit<Clinic, 'id' | 'createdAt'>): Clinic => {
    const newClinic: Clinic = {
      ...clinic,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    clinics.push(newClinic);
    return newClinic;
  },

  update: (id: string, updates: Partial<Clinic>): Clinic | null => {
    const index = clinics.findIndex(clinic => clinic.id === id);
    if (index === -1) return null;
    clinics[index] = { ...clinics[index], ...updates };
    return clinics[index];
  },

  delete: (id: string): boolean => {
    const index = clinics.findIndex(clinic => clinic.id === id);
    if (index === -1) return false;
    clinics.splice(index, 1);
    return true;
  },

  getCardCount: (clinicId: string): number =>
    cards.filter(card => card.clinicId === clinicId).length,
};

// CRUD Operations for Cards
export const cardOperations = {
  getAll: (): CardData[] => cards,

  getByControlNumber: (controlNumber: string): CardData | undefined =>
    cards.find(card => card.controlNumber === controlNumber),

  searchByQuery: (query: string): CardData[] => {
    const lowerQuery = query.toLowerCase();
    return cards.filter(card =>
      card.controlNumber.toLowerCase().includes(lowerQuery) ||
      card.fullName.toLowerCase().includes(lowerQuery) ||
      card.clinicName.toLowerCase().includes(lowerQuery)
    );
  },

  create: (card: Omit<CardData, 'createdAt'>): CardData => {
    const newCard: CardData = {
      ...card,
      createdAt: new Date().toISOString().split('T')[0],
    };
    cards.push(newCard);
    return newCard;
  },

  update: (controlNumber: string, updates: Partial<CardData>): CardData | null => {
    const index = cards.findIndex(card => card.controlNumber === controlNumber);
    if (index === -1) return null;
    cards[index] = { ...cards[index], ...updates };
    return cards[index];
  },

  delete: (controlNumber: string): boolean => {
    const index = cards.findIndex(card => card.controlNumber === controlNumber);
    if (index === -1) return false;
    cards.splice(index, 1);
    return true;
  },

  assignToClinic: (controlNumber: string, clinicId: string): CardData | null => {
    const card = cards.find(c => c.controlNumber === controlNumber);
    const clinic = clinics.find(c => c.id === clinicId);

    if (!card || !clinic) return null;

    // Check clinic plan limits
    const currentCount = cards.filter(c => c.clinicId === clinicId).length;
    const limit = PLAN_LIMITS[clinic.plan];

    if (currentCount >= limit) {
      throw new Error(`Clinic has reached its ${clinic.plan} plan limit of ${limit} cards`);
    }

    card.clinicId = clinicId;
    card.clinicName = clinic.name;
    return card;
  },
};

// CRUD Operations for Appointments
export const appointmentOperations = {
  getAll: (): Appointment[] => appointments,

  getByClinicId: (clinicId: string): Appointment[] =>
    appointments.filter(apt => apt.clinicId === clinicId),

  create: (appointment: Omit<Appointment, 'id'>): Appointment => {
    const newAppointment: Appointment = {
      ...appointment,
      id: Date.now().toString(),
    };
    appointments.push(newAppointment);
    return newAppointment;
  },

  update: (id: string, updates: Partial<Appointment>): Appointment | null => {
    const index = appointments.findIndex(apt => apt.id === id);
    if (index === -1) return null;
    appointments[index] = { ...appointments[index], ...updates };
    return appointments[index];
  },

  delete: (id: string): boolean => {
    const index = appointments.findIndex(apt => apt.id === id);
    if (index === -1) return false;
    appointments.splice(index, 1);
    return true;
  },
};

// Utility Functions
export const generateControlNumber = (id: string, region: string, areaCode: string): string => {
  return `MOC-${id.padStart(5, '0')}-${region}-${areaCode}`;
};

export const formatExpiryDate = (date: string): string => {
  return new Date(date).toLocaleDateString();
};

export const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};