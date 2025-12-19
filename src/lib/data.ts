// MOCARDS CLOUD - Data Layer (Legacy Compatible)
// Import unified schema for type definitions and constants
import {
  Card,
  Clinic,
  Appointment,
  ClinicPlan,
  PLAN_LIMITS,
  PLAN_PRICING,
  PHILIPPINES_REGIONS,
  AREA_CODES,
  type CardData,
  type ClinicData,
  type AppointmentData
} from './schema';

// Re-export types for backward compatibility
export type { ClinicPlan, Card, Clinic, Appointment, CardData, ClinicData, AppointmentData };
export { PLAN_LIMITS, PLAN_PRICING, PHILIPPINES_REGIONS, AREA_CODES };

// Legacy type aliases for backward compatibility - removed to avoid conflicts

// Production Database - Empty State
let cards: Card[] = [];

let clinics: Clinic[] = [];

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
  getAll: (): Card[] => cards,

  getByControlNumber: (controlNumber: string): Card | null => {
    return cards.find(card => card.controlNumber === controlNumber) || null;
  },

  getByClinicId: (clinicId: string): Card[] => {
    return cards.filter(card => card.clinicId === clinicId);
  },

  create: (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Card => {
    const newCard: Card = {
      ...card,
      id: (cards.length + 1).toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cards.push(newCard);
    return newCard;
  },

  createBatch: (
    startId: number,
    endId: number,
    region: string,
    areaCode: string
  ): Card[] => {
    const newCards: Card[] = [];
    const now = new Date().toISOString();

    for (let i = startId; i <= endId; i++) {
      const card: Card = {
        id: `card_${Date.now()}_${i}`,
        controlNumber: generateControlNumber(i, region, areaCode),
        fullName: `Patient ${i}`,
        status: 'inactive',
        perksTotal: 5,
        perksUsed: 0,
        clinicId: '',
        expiryDate: '2025-12-31',
        createdAt: now,
        updatedAt: now,
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

  create: (clinic: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt' | 'subscriptionStatus' | 'subscriptionStartDate' | 'maxCards' | 'isActive'>): Clinic => {
    const newClinic: Clinic = {
      ...clinic,
      id: (clinics.length + 1).toString(),
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      maxCards: PLAN_LIMITS[clinic.plan],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
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