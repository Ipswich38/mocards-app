// MOCARDS CLOUD - Data Layer with Cloud Sync
// Import unified schema for type definitions and constants
import {
  Card,
  Clinic,
  Appointment,
  Perk,
  PerkType,
  ClinicPlan,
  PLAN_LIMITS,
  PLAN_PRICING,
  PHILIPPINES_REGIONS,
  AREA_CODES,
  DEFAULT_PERKS,
  type CardData,
  type ClinicData,
  type AppointmentData
} from './schema';

// Import cloud sync operations for multi-device persistence
import { cloudOperations } from './cloudSync';

// Re-export types for backward compatibility
export type { ClinicPlan, Card, Clinic, Appointment, Perk, PerkType, CardData, ClinicData, AppointmentData };
export { PLAN_LIMITS, PLAN_PRICING, PHILIPPINES_REGIONS, AREA_CODES, DEFAULT_PERKS };

// Legacy type aliases for backward compatibility - removed to avoid conflicts

// Cloud-Synced Database - Multi-device persistence
// Data is automatically synced across all devices and browsers
// No more local-only storage!

// Enhanced Perk Usage for tracking redemption history
export interface PerkRedemption {
  id: string;
  cardControlNumber: string;
  perkId: string;
  perkName: string;
  clinicId: string;
  claimantName: string; // Patient name
  handledBy: string; // Clinic staff who processed
  serviceType: string; // What service was provided
  usedAt: string; // ISO Date timestamp
  value: number; // Value of the perk
  notes?: string;
}

// Note: perkRedemptions moved to cloud storage - no local array needed

// Utility Functions
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-PH');
};

export const generateControlNumber = (id: number, region: string, areaCode: string): string => {
  const paddedId = id.toString().padStart(5, '0');
  return `MOC-${paddedId}-${region}-${areaCode}`;
};

export const generateClinicCode = (areaCode: string): string => {
  const clinics = cloudOperations.clinics.getAll();
  const existingCodes = clinics.map((c: Clinic) => c.code);
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

// Card Operations with Cloud Sync
export const cardOperations = {
  getAll: (): Card[] => cloudOperations.cards.getAll(),

  getByControlNumber: (controlNumber: string): Card | null => {
    const cards = cloudOperations.cards.getAll();
    return cards.find(card => card.controlNumber === controlNumber) || null;
  },

  getByClinicId: (clinicId: string): Card[] => {
    const cards = cloudOperations.cards.getAll();
    return cards.filter(card => card.clinicId === clinicId);
  },

  create: (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Card => {
    const newCard: Card = {
      ...card,
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to cloud immediately
    cloudOperations.cards.add(newCard);
    return newCard;
  },

  createBatch: (
    startId: number,
    endId: number,
    region: string,
    areaCode: string,
    perksTotal: number = 5
  ): Card[] => {
    const existingCards = cloudOperations.cards.getAll();
    const newCards: Card[] = [];
    const now = new Date().toISOString();

    for (let i = startId; i <= endId; i++) {
      const card: Card = {
        id: `card_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        controlNumber: generateControlNumber(i, region, areaCode),
        fullName: '', // Empty name - will be filled when card is activated
        status: 'inactive',
        perksTotal,
        perksUsed: 0,
        clinicId: '',
        expiryDate: '2025-12-31',
        createdAt: now,
        updatedAt: now,
      };
      newCards.push(card);
    }

    // Save batch to cloud
    const allCards = [...existingCards, ...newCards];
    cloudOperations.cards.save(allCards);
    return newCards;
  },

  updateStatus: (controlNumber: string, status: 'active' | 'inactive'): boolean => {
    const cards = cloudOperations.cards.getAll();
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      // Update cloud storage
      cloudOperations.cards.update(card.id, { status });
      return true;
    }
    return false;
  },

  assignToClinic: (controlNumbers: string[], clinicId: string): boolean => {
    const clinics = cloudOperations.clinics.getAll();
    const cards = cloudOperations.cards.getAll();
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return false;

    // Check plan limits
    const currentAssigned = cards.filter(c => c.clinicId === clinicId).length;
    const limit = PLAN_LIMITS[clinic.plan];

    if (currentAssigned + controlNumbers.length > limit) {
      return false; // Exceeds plan limit
    }

    // Assign cards in cloud storage
    controlNumbers.forEach(controlNumber => {
      const card = cards.find(c => c.controlNumber === controlNumber);
      if (card) {
        cloudOperations.cards.update(card.id, { clinicId });
      }
    });

    return true;
  },

  updatePerks: (controlNumber: string, perksUsed: number): boolean => {
    const cards = cloudOperations.cards.getAll();
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      const updatedPerksUsed = Math.min(perksUsed, card.perksTotal);
      cloudOperations.cards.update(card.id, { perksUsed: updatedPerksUsed });
      return true;
    }
    return false;
  },

  delete: (controlNumber: string): boolean => {
    const cards = cloudOperations.cards.getAll();
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      cloudOperations.cards.remove(card.id);
      return true;
    }
    return false;
  },
};

// Perk Operations with Cloud Sync
export const perkOperations = {
  getAll: (): Perk[] => cloudOperations.perks.getAll(),

  getById: (id: string): Perk | null => {
    const perks = cloudOperations.perks.getAll();
    return perks.find(perk => perk.id === id) || null;
  },

  getByType: (type: PerkType): Perk[] => {
    const perks = cloudOperations.perks.getAll();
    return perks.filter(perk => perk.type === type);
  },

  getActive: (): Perk[] => {
    const perks = cloudOperations.perks.getAll();
    return perks.filter(perk => perk.isActive);
  },

  create: (perk: Omit<Perk, 'id' | 'createdAt' | 'updatedAt'>): Perk => {
    const newPerk: Perk = {
      ...perk,
      id: `perk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to cloud immediately
    cloudOperations.perks.add(newPerk);
    return newPerk;
  },

  update: (id: string, updates: Partial<Perk>): boolean => {
    const perks = cloudOperations.perks.getAll();
    const perk = perks.find(p => p.id === id);
    if (perk) {
      const updatedPerk = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      cloudOperations.perks.update(id, updatedPerk);
      return true;
    }
    return false;
  },

  delete: (id: string): boolean => {
    cloudOperations.perks.remove(id);
    return true;
  },

  // Initialize with default perks
  initializeDefaults: (): void => {
    const perks = cloudOperations.perks.getAll();
    if (perks.length === 0) {
      DEFAULT_PERKS.forEach(defaultPerk => {
        perkOperations.create(defaultPerk);
      });
    }
  },
};

// Clinic Operations with Cloud Sync
export const clinicOperations = {
  getAll: (): Clinic[] => cloudOperations.clinics.getAll(),

  getById: (id: string): Clinic | null => {
    const clinics = cloudOperations.clinics.getAll();
    return clinics.find(clinic => clinic.id === id) || null;
  },

  getByCode: (code: string): Clinic | null => {
    const clinics = cloudOperations.clinics.getAll();
    return clinics.find(clinic => clinic.code === code) || null;
  },

  authenticate: (code: string, password: string): Clinic | null => {
    const clinics = cloudOperations.clinics.getAll();
    return clinics.find(clinic =>
      clinic.code === code && clinic.password === password
    ) || null;
  },

  create: (clinic: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt' | 'subscriptionStatus' | 'subscriptionStartDate' | 'maxCards' | 'isActive'>): Clinic => {
    const newClinic: Clinic = {
      ...clinic,
      id: `clinic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      maxCards: PLAN_LIMITS[clinic.plan],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    // Save to cloud immediately
    cloudOperations.clinics.add(newClinic);
    return newClinic;
  },

  update: (id: string, updates: Partial<Clinic>): boolean => {
    const clinics = cloudOperations.clinics.getAll();
    const clinic = clinics.find(c => c.id === id);
    if (clinic) {
      cloudOperations.clinics.update(id, updates);
      return true;
    }
    return false;
  },

  delete: (id: string): boolean => {
    cloudOperations.clinics.remove(id);
    return true;
  },

  getAssignedCardsCount: (clinicId: string): number => {
    const cards = cloudOperations.cards.getAll();
    return cards.filter(card => card.clinicId === clinicId).length;
  },

  getPlanLimit: (clinicId: string): number => {
    const clinics = cloudOperations.clinics.getAll();
    const clinic = clinics.find(c => c.id === clinicId);
    return clinic ? PLAN_LIMITS[clinic.plan] : 0;
  },
};

// Appointment Operations with Cloud Sync
export const appointmentOperations = {
  getAll: (): Appointment[] => cloudOperations.appointments.getAll(),

  getByClinicId: (clinicId: string): Appointment[] => {
    const appointments = cloudOperations.appointments.getAll();
    return appointments.filter(apt => apt.clinicId === clinicId);
  },

  create: (appointment: Omit<Appointment, 'id'>): Appointment => {
    const newAppointment: Appointment = {
      ...appointment,
      id: `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Save to cloud immediately
    cloudOperations.appointments.add(newAppointment);
    return newAppointment;
  },

  updateStatus: (id: string, status: Appointment['status']): boolean => {
    const appointments = cloudOperations.appointments.getAll();
    const appointment = appointments.find(a => a.id === id);
    if (appointment) {
      cloudOperations.appointments.update(id, { status });
      return true;
    }
    return false;
  },
};

// Perk Redemption Operations with Cloud Sync
export const perkRedemptionOperations = {
  getAll: (): PerkRedemption[] => cloudOperations.perkRedemptions.getAll(),

  getByCardNumber: (cardControlNumber: string): PerkRedemption[] => {
    const redemptions = cloudOperations.perkRedemptions.getAll();
    return redemptions.filter(redemption => redemption.cardControlNumber === cardControlNumber);
  },

  getByClinicId: (clinicId: string): PerkRedemption[] => {
    const redemptions = cloudOperations.perkRedemptions.getAll();
    return redemptions.filter(redemption => redemption.clinicId === clinicId);
  },

  create: (redemption: Omit<PerkRedemption, 'id'>): PerkRedemption => {
    const newRedemption: PerkRedemption = {
      ...redemption,
      id: `redemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Save to cloud immediately
    cloudOperations.perkRedemptions.add(newRedemption);
    return newRedemption;
  },

  // Get redemption history for a specific perk type
  getByPerkType: (cardControlNumber: string, perkName: string): PerkRedemption[] => {
    const redemptions = cloudOperations.perkRedemptions.getAll();
    return redemptions.filter(redemption =>
      redemption.cardControlNumber === cardControlNumber &&
      redemption.perkName.toLowerCase().includes(perkName.toLowerCase())
    );
  },
};