// MOCARDS CLOUD - Clean Data Layer
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
  plan: 'starter' | 'growth' | 'pro';
  code: string;
  password: string; // For clinic login
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

// Plan Limits
export const PLAN_LIMITS = {
  starter: 500,
  growth: 1000,
  pro: 2000,
} as const;

// Mock Database
let cards: CardData[] = [
  {
    controlNumber: 'MOC-00001-01-DEN001',
    fullName: 'Juan Dela Cruz',
    status: 'active',
    perksTotal: 5,
    perksUsed: 2,
    clinicId: '1',
    expiryDate: '2025-12-31',
  },
  {
    controlNumber: 'MOC-00002-01-DEN001',
    fullName: 'Maria Santos',
    status: 'active',
    perksTotal: 5,
    perksUsed: 1,
    clinicId: '1',
    expiryDate: '2025-12-31',
  },
  {
    controlNumber: 'MOC-00003-05-MED002',
    fullName: 'Jose Garcia',
    status: 'inactive',
    perksTotal: 8,
    perksUsed: 0,
    clinicId: '2',
    expiryDate: '2025-12-31',
  },
  {
    controlNumber: 'MOC-00004-08-CVT003',
    fullName: 'Ana Rodriguez',
    status: 'active',
    perksTotal: 10,
    perksUsed: 3,
    clinicId: '3',
    expiryDate: '2025-12-31',
  },
];

let clinics: Clinic[] = [
  {
    id: '1',
    name: 'Smile Dental Clinic',
    region: '01',
    plan: 'starter',
    code: 'DEN001',
    password: 'dental123',
  },
  {
    id: '2',
    name: 'Health Plus Medical',
    region: '05',
    plan: 'growth',
    code: 'MED002',
    password: 'health456',
  },
  {
    id: '3',
    name: 'Premier Care',
    region: '08',
    plan: 'pro',
    code: 'CVT003',
    password: 'premier789',
  },
];

let appointments: Appointment[] = [
  {
    id: '1',
    cardControlNumber: 'MOC-00001-01-DEN001',
    clinicId: '1',
    patientName: 'Juan Dela Cruz',
    date: '2024-12-20',
    time: '10:00',
    status: 'scheduled',
  },
  {
    id: '2',
    cardControlNumber: 'MOC-00002-01-DEN001',
    clinicId: '1',
    patientName: 'Maria Santos',
    date: '2024-12-21',
    time: '14:30',
    status: 'scheduled',
  },
];

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

  updateStatus: (controlNumber: string, status: 'active' | 'inactive'): boolean => {
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      card.status = status;
      return true;
    }
    return false;
  },

  assignToClinic: (controlNumbers: string[], clinicId: string): { success: boolean; error?: string } => {
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return { success: false, error: 'Clinic not found' };

    const currentCount = cards.filter(c => c.clinicId === clinicId).length;
    const limit = PLAN_LIMITS[clinic.plan];

    if (currentCount + controlNumbers.length > limit) {
      return {
        success: false,
        error: `Assignment blocked: Clinic plan limit (${limit}) would be exceeded. Current: ${currentCount}, Adding: ${controlNumbers.length}`
      };
    }

    controlNumbers.forEach(controlNumber => {
      const card = cards.find(c => c.controlNumber === controlNumber);
      if (card) {
        card.clinicId = clinicId;
      }
    });

    return { success: true };
  },

  generateBatch: (startId: number, endId: number, region: string, areaCode: string): CardData[] => {
    const newCards: CardData[] = [];

    for (let i = startId; i <= endId; i++) {
      const controlNumber = `MOC-${i.toString().padStart(5, '0')}-${region.padStart(2, '0')}-${areaCode}`;
      const newCard: CardData = {
        controlNumber,
        fullName: `Generated User ${i}`,
        status: 'inactive',
        perksTotal: 5,
        perksUsed: 0,
        clinicId: '',
        expiryDate: '2025-12-31',
      };
      newCards.push(newCard);
      cards.push(newCard);
    }

    return newCards;
  },
};

// Clinic Operations
export const clinicOperations = {
  getAll: (): Clinic[] => clinics,

  getById: (id: string): Clinic | null => {
    return clinics.find(clinic => clinic.id === id) || null;
  },

  authenticate: (code: string, password: string): Clinic | null => {
    return clinics.find(clinic => clinic.code === code && clinic.password === password) || null;
  },

  getCardCount: (clinicId: string): number => {
    return cards.filter(card => card.clinicId === clinicId).length;
  },

  getCardLimit: (clinicId: string): number => {
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
      id: Date.now().toString(),
    };
    appointments.push(newAppointment);
    return newAppointment;
  },
};

// Admin Operations
export const adminOperations = {
  authenticate: (username: string, password: string): boolean => {
    return username === 'admin' && password === 'admin123';
  },
};

// Utility Functions
export const generateControlNumber = (id: number, region: string, areaCode: string): string => {
  return `MOC-${id.toString().padStart(5, '0')}-${region.padStart(2, '0')}-${areaCode}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-50 border-green-200';
    case 'inactive': return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'completed': return 'text-green-600 bg-green-50 border-green-200';
    case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};