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

export const generateClinicCode = async (areaCode: string): Promise<string> => {
  const clinics = await cloudOperations.clinics.getAll();
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
  getAll: async (): Promise<Card[]> => await cloudOperations.cards.getAll(),

  getByControlNumber: async (controlNumber: string): Promise<Card | null> => {
    const cards = await cloudOperations.cards.getAll();
    return cards.find(card => card.controlNumber === controlNumber) || null;
  },

  getByClinicId: async (clinicId: string): Promise<Card[]> => {
    const cards = await cloudOperations.cards.getAll();
    return cards.filter(card => card.clinicId === clinicId);
  },

  create: async (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<Card> => {
    // Save to cloud immediately - let PostgreSQL generate the UUID
    try {
      const createdCard = await cloudOperations.cards.add(card);
      return createdCard;
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error; // Re-throw to let the caller handle it
    }
  },

  generateCards: async (
    quantity: number,
    region: string,
    areaCode: string,
    perksTotal: number = 5
  ): Promise<Card[]> => {
    const newCards: Card[] = [];

    console.log('[GENERATOR] Creating', quantity, 'cards with region:', region, 'areaCode:', areaCode);

    // Get existing cards to find the next available ID
    const existingCards = await cloudOperations.cards.getAll();
    const existingControlNumbers = new Set(existingCards.map(card => card.controlNumber));

    // Find the highest existing ID for this region/areaCode combination
    let nextId = 1;
    const pattern = new RegExp(`MOC-(\\d+)-${region}-${areaCode}`);

    existingCards.forEach(card => {
      const match = card.controlNumber.match(pattern);
      if (match) {
        const cardId = parseInt(match[1]);
        if (cardId >= nextId) {
          nextId = cardId + 1;
        }
      }
    });

    console.log('[GENERATOR] Starting from ID:', nextId);

    let created = 0;
    let attempts = 0;
    const maxAttempts = quantity * 2; // Safety limit

    while (created < quantity && attempts < maxAttempts) {
      const controlNumber = generateControlNumber(nextId, region, areaCode);
      attempts++;

      // Skip if card already exists (safety check)
      if (existingControlNumbers.has(controlNumber)) {
        console.log('[GENERATOR] Skipping existing card:', controlNumber);
        nextId++;
        continue;
      }

      const card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'> = {
        controlNumber,
        fullName: '', // Empty name - will be filled when card is activated
        status: 'inactive',
        perksTotal,
        perksUsed: 0,
        clinicId: '',
        expiryDate: '2025-12-31',
      };

      console.log('[GENERATOR] Creating card:', card.controlNumber);

      // Create each card individually in Supabase
      try {
        const createdCard = await cloudOperations.cards.add(card);
        newCards.push(createdCard);
        existingControlNumbers.add(controlNumber); // Update our local set
        created++;
        nextId++;
        console.log(`[GENERATOR] Card created successfully (${created}/${quantity}):`, createdCard.controlNumber);
      } catch (error) {
        console.error('[GENERATOR] Failed to create card:', card.controlNumber, error);
        throw new Error(`Failed to create card ${card.controlNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (created < quantity) {
      console.warn(`[GENERATOR] Only created ${created} out of ${quantity} requested cards`);
    }

    console.log('[GENERATOR] Successfully created', created, 'unique cards');
    return newCards;
  },

  updateStatus: async (controlNumber: string, status: 'active' | 'inactive'): Promise<boolean> => {
    const cards = await cloudOperations.cards.getAll();
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      // Update cloud storage
      await cloudOperations.cards.update(card.id, { status });
      return true;
    }
    return false;
  },

  assignToClinic: async (controlNumbers: string[], clinicId: string): Promise<boolean> => {
    const clinics = await cloudOperations.clinics.getAll();
    const cards = await cloudOperations.cards.getAll();
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return false;

    // Check plan limits
    const currentAssigned = cards.filter(c => c.clinicId === clinicId).length;
    const limit = PLAN_LIMITS[clinic.plan];

    if (currentAssigned + controlNumbers.length > limit) {
      return false; // Exceeds plan limit
    }

    // Assign cards in cloud storage
    await Promise.all(controlNumbers.map(async controlNumber => {
      const card = cards.find(c => c.controlNumber === controlNumber);
      if (card) {
        await cloudOperations.cards.update(card.id, { clinicId });
      }
    }));

    return true;
  },

  updatePerks: async (controlNumber: string, perksUsed: number): Promise<boolean> => {
    const cards = await cloudOperations.cards.getAll();
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      const updatedPerksUsed = Math.min(perksUsed, card.perksTotal);
      await cloudOperations.cards.update(card.id, { perksUsed: updatedPerksUsed });
      return true;
    }
    return false;
  },

  delete: async (controlNumber: string): Promise<boolean> => {
    const cards = await cloudOperations.cards.getAll();
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      await cloudOperations.cards.remove(card.id);
      return true;
    }
    return false;
  },
};

// Perk Operations with Cloud Sync
export const perkOperations = {
  getAll: async (): Promise<Perk[]> => await cloudOperations.perks.getAll(),

  getById: async (id: string): Promise<Perk | null> => {
    const perks = await cloudOperations.perks.getAll();
    return perks.find(perk => perk.id === id) || null;
  },

  getByType: async (type: PerkType): Promise<Perk[]> => {
    const perks = await cloudOperations.perks.getAll();
    return perks.filter(perk => perk.type === type);
  },

  getActive: async (): Promise<Perk[]> => {
    const perks = await cloudOperations.perks.getAll();
    return perks.filter(perk => perk.isActive);
  },

  create: async (perk: Omit<Perk, 'id' | 'createdAt' | 'updatedAt'>): Promise<Perk> => {
    const newPerk: Perk = {
      ...perk,
      id: `perk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to cloud immediately
    await cloudOperations.perks.add(newPerk);
    return newPerk;
  },

  update: async (id: string, updates: Partial<Perk>): Promise<boolean> => {
    const perks = await cloudOperations.perks.getAll();
    const perk = perks.find(p => p.id === id);
    if (perk) {
      const updatedPerk = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await cloudOperations.perks.update(id, updatedPerk);
      return true;
    }
    return false;
  },

  delete: async (id: string): Promise<boolean> => {
    await cloudOperations.perks.remove(id);
    return true;
  },

  // Initialize with default perks
  initializeDefaults: async (): Promise<void> => {
    const perks = await cloudOperations.perks.getAll();
    if (perks.length === 0) {
      await Promise.all(DEFAULT_PERKS.map(async defaultPerk => {
        await perkOperations.create(defaultPerk);
      }));
    }
  },
};

// Clinic Operations with Cloud Sync
export const clinicOperations = {
  getAll: async (): Promise<Clinic[]> => await cloudOperations.clinics.getAll(),

  getById: async (id: string): Promise<Clinic | null> => {
    const clinics = await cloudOperations.clinics.getAll();
    return clinics.find(clinic => clinic.id === id) || null;
  },

  getByCode: async (code: string): Promise<Clinic | null> => {
    const clinics = await cloudOperations.clinics.getAll();
    return clinics.find(clinic => clinic.code === code) || null;
  },

  authenticate: async (username: string, password: string): Promise<Clinic | null> => {
    const clinics = await cloudOperations.clinics.getAll();
    return clinics.find(clinic =>
      clinic.username === username && clinic.password === password
    ) || null;
  },

  create: async (clinic: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt' | 'subscriptionStatus' | 'subscriptionStartDate' | 'maxCards' | 'isActive'>): Promise<Clinic> => {
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
    await cloudOperations.clinics.add(newClinic);
    return newClinic;
  },

  update: async (id: string, updates: Partial<Clinic>): Promise<boolean> => {
    const clinics = await cloudOperations.clinics.getAll();
    const clinic = clinics.find(c => c.id === id);
    if (clinic) {
      await cloudOperations.clinics.update(id, updates);
      return true;
    }
    return false;
  },

  delete: async (id: string): Promise<boolean> => {
    await cloudOperations.clinics.remove(id);
    return true;
  },

  getAssignedCardsCount: async (clinicId: string): Promise<number> => {
    const cards = await cloudOperations.cards.getAll();
    return cards.filter(card => card.clinicId === clinicId).length;
  },

  getPlanLimit: async (clinicId: string): Promise<number> => {
    const clinics = await cloudOperations.clinics.getAll();
    const clinic = clinics.find(c => c.id === clinicId);
    return clinic ? PLAN_LIMITS[clinic.plan] : 0;
  },
};

// Appointment Operations with Cloud Sync
export const appointmentOperations = {
  getAll: async (): Promise<Appointment[]> => await cloudOperations.appointments.getAll(),

  getByClinicId: async (clinicId: string): Promise<Appointment[]> => {
    const appointments = await cloudOperations.appointments.getAll();
    return appointments.filter(apt => apt.clinicId === clinicId);
  },

  create: async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
    const newAppointment: Appointment = {
      ...appointment,
      id: `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Save to cloud immediately
    await cloudOperations.appointments.add(newAppointment);
    return newAppointment;
  },

  updateStatus: async (id: string, status: Appointment['status']): Promise<boolean> => {
    const appointments = await cloudOperations.appointments.getAll();
    const appointment = appointments.find(a => a.id === id);
    if (appointment) {
      await cloudOperations.appointments.update(id, { status });
      return true;
    }
    return false;
  },
};

// Perk Redemption Operations with Cloud Sync
export const perkRedemptionOperations = {
  getAll: async (): Promise<PerkRedemption[]> => await cloudOperations.perkRedemptions.getAll(),

  getByCardNumber: async (cardControlNumber: string): Promise<PerkRedemption[]> => {
    const redemptions = await cloudOperations.perkRedemptions.getAll();
    return redemptions.filter(redemption => redemption.cardControlNumber === cardControlNumber);
  },

  getByClinicId: async (clinicId: string): Promise<PerkRedemption[]> => {
    const redemptions = await cloudOperations.perkRedemptions.getAll();
    return redemptions.filter(redemption => redemption.clinicId === clinicId);
  },

  create: async (redemption: Omit<PerkRedemption, 'id'>): Promise<PerkRedemption> => {
    // Save to cloud immediately and get the returned redemption with real ID
    return await cloudOperations.perkRedemptions.add(redemption);
  },

  // Get redemption history for a specific perk type
  getByPerkType: async (cardControlNumber: string, perkName: string): Promise<PerkRedemption[]> => {
    const redemptions = await cloudOperations.perkRedemptions.getAll();
    return redemptions.filter(redemption =>
      redemption.cardControlNumber === cardControlNumber &&
      redemption.perkName.toLowerCase().includes(perkName.toLowerCase())
    );
  },
};