# Core MOCARDS Workflow - OpenDental Style
## Streamlined Card Lifecycle Management System

### 🎯 **Core Workflow (4 Simple Steps):**

```
1. ADMIN → Generate & Assign Cards to Clinics
2. CLINIC → Sell, Activate & Complete Passcodes
3. CLINIC → Redeem Perks During Patient Visits
4. CARDHOLDER → View Card Status & Details
```

### 🏗️ **System Architecture:**

#### **1. ADMIN PANEL (Starting Point)**
**Purpose:** Generate secure cards and manage clinic partners

**Key Functions:**
- ✅ Generate fresh, unique virtual loyalty cards (batches)
- ✅ Add/manage authorized clinic partners
- ✅ Assign card batches to specific clinics
- ✅ Monitor overall system activity

**Admin Dashboard Sections:**
```
┌─────────────────────────────────────────┐
│ 🎯 Admin Dashboard                      │
├─────────────────────────────────────────┤
│ 📦 Card Generation                      │
│   • Generate New Batch (10/25/50/100)  │
│   • View Generated Batches             │
│                                         │
│ 🏥 Clinic Management                    │
│   • Add New Clinic Partner             │
│   • Assign Cards to Clinics            │
│   • View Clinic Activity               │
│                                         │
│ 📊 System Overview                      │
│   • Total Cards Generated              │
│   • Cards Assigned to Clinics          │
│   • Active Cards in System             │
└─────────────────────────────────────────┘
```

#### **2. CLINIC DASHBOARD (Mirrored Cards)**
**Purpose:** Manage assigned cards and patient interactions

**Key Functions:**
- ✅ View all cards assigned to this clinic
- ✅ Sell & activate cards for patients
- ✅ Complete passcodes with location code
- ✅ Redeem perks during patient visits

**Clinic Dashboard Sections:**
```
┌─────────────────────────────────────────┐
│ 🏥 Clinic Dashboard - [CLINIC NAME]    │
├─────────────────────────────────────────┤
│ 🎫 My Assigned Cards                    │
│   • Cards ready to sell (unactivated)  │
│   • Cards sold to patients (activated) │
│                                         │
│ 💳 Card Operations                      │
│   • Activate Card for Patient          │
│   • Complete Passcode (add location)   │
│                                         │
│ 🎁 Perk Redemption                      │
│   • Redeem Patient Perks               │
│   • View Redemption History            │
│                                         │
│ 📈 My Statistics                        │
│   • Cards Sold This Month              │
│   • Perks Redeemed                     │
│   • Revenue Generated                  │
└─────────────────────────────────────────┘
```

#### **3. CARDHOLDER LOOKUP**
**Purpose:** Simple card status checker for patients

**Key Functions:**
- ✅ Enter control number + passcode
- ✅ View card details and validity
- ✅ See available/redeemed perks
- ✅ Check expiration date

**Cardholder Interface:**
```
┌─────────────────────────────────────────┐
│ 🔍 Check Your Card Status              │
├─────────────────────────────────────────┤
│ Control Number: [MOC-12345678-001]      │
│ Passcode:      [CAV1234]               │
│                                         │
│ [🔍 Check Card Status]                 │
│                                         │
│ ──── Card Details ────                 │
│ Status: ✅ Active                       │
│ Expires: December 3, 2026              │
│ Clinic: Cavite Dental Center           │
│                                         │
│ ──── Available Perks ────              │
│ ✅ Free Consultation                    │
│ ✅ Teeth Cleaning                       │
│ ❌ Tooth Extraction (Used)              │
│ ✅ Fluoride Treatment                   │
└─────────────────────────────────────────┘
```

### 🔄 **OpenDental-Style Card Lifecycle:**

#### **Phase 1: Admin Card Generation**
```sql
-- Admin generates batch with incomplete passcodes
INSERT INTO card_batches (batch_number, total_cards, created_by)
VALUES ('MOB-20241203', 100, 'admin-id');

-- Generate 100 cards with 4-digit incomplete passcodes
INSERT INTO cards (control_number, passcode, status, location_code)
VALUES
  ('MOC-20241203-001', '1234', 'unactivated', 'PHL'),
  ('MOC-20241203-002', '5678', 'unactivated', 'PHL'),
  -- ... 98 more cards
```

#### **Phase 2: Admin Assigns to Clinic**
```sql
-- Admin assigns 50 cards to Cavite clinic
UPDATE cards
SET assigned_clinic_id = 'cavite-clinic-id'
WHERE batch_id = 'batch-id'
AND id IN (SELECT id FROM cards ORDER BY created_at LIMIT 50);
```

#### **Phase 3: Clinic Sells & Activates**
```sql
-- Clinic completes passcode and activates for patient
UPDATE cards
SET
  passcode = 'CAV1234',  -- Location code + original passcode
  location_code = 'CAV',
  status = 'activated',
  activated_at = NOW(),
  expires_at = NOW() + INTERVAL '1 year'
WHERE control_number = 'MOC-20241203-001';
```

#### **Phase 4: Clinic Redeems Perks**
```sql
-- Clinic marks perk as redeemed during patient visit
UPDATE card_perks
SET
  claimed = true,
  claimed_at = NOW(),
  claimed_by_clinic = 'cavite-clinic-id'
WHERE card_id = 'card-id' AND perk_type = 'consultation';
```

#### **Phase 5: Patient Checks Status**
```sql
-- Patient looks up card status
SELECT
  c.control_number,
  c.passcode,
  c.status,
  c.activated_at,
  c.expires_at,
  mc.clinic_name,
  COUNT(cp.id) as total_perks,
  COUNT(CASE WHEN cp.claimed = false THEN 1 END) as available_perks
FROM cards c
LEFT JOIN mocards_clinics mc ON c.assigned_clinic_id = mc.id
LEFT JOIN card_perks cp ON c.id = cp.card_id
WHERE c.control_number = 'MOC-20241203-001'
AND c.passcode = 'CAV1234';
```

### 🎯 **Core Database Schema (Simplified):**

```sql
-- Core tables for OpenDental-style workflow
cards (
  id, control_number, passcode, status,
  assigned_clinic_id, activated_at, expires_at
)

mocards_clinics (
  id, clinic_name, clinic_code,
  contact_email, address
)

card_perks (
  id, card_id, perk_type, claimed,
  claimed_at, claimed_by_clinic
)

card_batches (
  id, batch_number, total_cards,
  created_by, created_at
)
```

### 💡 **Key OpenDental-Style Features:**

1. **Centralized Admin Control** - Admin generates and distributes
2. **Clinic Autonomy** - Clinics manage their assigned cards independently
3. **Real-time Mirroring** - Cards appear instantly in clinic dashboards
4. **Simple Patient Interface** - Just control number + passcode lookup
5. **Clear Lifecycle** - Unactivated → Assigned → Activated → Redeemed
6. **Secure Passcodes** - Location-based completion prevents fraud

### 🚀 **Implementation Priority:**

1. **Admin Card Generation & Assignment System** (Week 1)
2. **Clinic Dashboard with Card Management** (Week 2)
3. **Perk Redemption Interface** (Week 3)
4. **Cardholder Lookup System** (Week 4)

This gives us a clean, focused system that mirrors OpenDental's approach - simple, secure, and efficient card lifecycle management.