-- COMPREHENSIVE NCR CLINIC CODES UPDATE
-- MOC Card System V2.0 - December 11, 2025
-- All 17 Cities and Municipalities in Metro Manila (NCR)

-- ===========================================
-- COMPLETE NCR CLINIC CODES COVERAGE
-- ===========================================
-- This update expands from 9 to 17 clinic codes for complete NCR coverage
-- Location Code: 01 (assigned to NCR)

INSERT INTO clinic_codes_by_region (clinic_code, region_type, region_name, location_code, description) VALUES

-- ===========================================
-- HIGHLY URBANIZED CITIES (16 CITIES)
-- ===========================================

-- Major Financial/Business Centers
('NCR1', 'ncr', 'Manila Dental Centers', '01', 'Dental clinics in Manila - Capital City'),
('NCR2', 'ncr', 'Quezon City Centers', '01', 'Dental clinics in Quezon City - Most Populous'),
('NCR3', 'ncr', 'Makati Centers', '01', 'Dental clinics in Makati - Financial District'),
('NCR4', 'ncr', 'Pasig Centers', '01', 'Dental clinics in Pasig - Business Hub'),
('NCR5', 'ncr', 'Taguig Centers', '01', 'Dental clinics in Taguig - BGC Area'),

-- Mid-Tier Urban Centers
('NCR6', 'ncr', 'Marikina Centers', '01', 'Dental clinics in Marikina'),
('NCR7', 'ncr', 'Caloocan Centers', '01', 'Dental clinics in Caloocan'),
('NCR8', 'ncr', 'Las Piñas Centers', '01', 'Dental clinics in Las Piñas'),
('NCR9', 'ncr', 'Muntinlupa Centers', '01', 'Dental clinics in Muntinlupa'),

-- Additional Urban Centers (Newly Added)
('NC10', 'ncr', 'Mandaluyong Centers', '01', 'Dental clinics in Mandaluyong - Tiger City'),
('NC11', 'ncr', 'San Juan Centers', '01', 'Dental clinics in San Juan'),
('NC12', 'ncr', 'Parañaque Centers', '01', 'Dental clinics in Parañaque'),
('NC13', 'ncr', 'Valenzuela Centers', '01', 'Dental clinics in Valenzuela'),
('NC14', 'ncr', 'Malabon Centers', '01', 'Dental clinics in Malabon'),
('NC15', 'ncr', 'Navotas Centers', '01', 'Dental clinics in Navotas'),
('NC17', 'ncr', 'Pasay Centers', '01', 'Dental clinics in Pasay - Airport Area'),

-- ===========================================
-- MUNICIPALITY (1 MUNICIPALITY)
-- ===========================================
('NC16', 'ncr', 'Pateros Centers', '01', 'Dental clinics in Pateros - Municipality')

ON CONFLICT (clinic_code) DO NOTHING;

-- ===========================================
-- CONTROL NUMBER EXAMPLES - COMPLETE NCR
-- ===========================================

-- All 17 NCR Areas with Example Control Numbers:
-- MOC-01-NCR1-00001 (Manila, Card #1)
-- MOC-01-NCR2-00025 (Quezon City, Card #25)
-- MOC-01-NCR3-00050 (Makati, Card #50)
-- MOC-01-NCR4-00075 (Pasig, Card #75)
-- MOC-01-NCR5-00100 (Taguig, Card #100)
-- MOC-01-NCR6-00125 (Marikina, Card #125)
-- MOC-01-NCR7-00150 (Caloocan, Card #150)
-- MOC-01-NCR8-00175 (Las Piñas, Card #175)
-- MOC-01-NCR9-00200 (Muntinlupa, Card #200)
-- MOC-01-NC10-00225 (Mandaluyong, Card #225)
-- MOC-01-NC11-00250 (San Juan, Card #250)
-- MOC-01-NC12-00275 (Parañaque, Card #275)
-- MOC-01-NC13-00300 (Valenzuela, Card #300)
-- MOC-01-NC14-00325 (Malabon, Card #325)
-- MOC-01-NC15-00350 (Navotas, Card #350)
-- MOC-01-NC16-00375 (Pateros, Card #375)
-- MOC-01-NC17-00400 (Pasay, Card #400)

-- ===========================================
-- GEOGRAPHIC COVERAGE SUMMARY
-- ===========================================

-- NORTH NCR: Caloocan, Malabon, Navotas, Valenzuela
-- Clinic Codes: NCR7, NC14, NC15, NC13

-- CENTRAL NCR: Manila, Quezon City, San Juan, Mandaluyong, Pasig, Marikina
-- Clinic Codes: NCR1, NCR2, NC11, NC10, NCR4, NCR6

-- SOUTH NCR: Makati, Taguig, Pasay, Parañaque, Las Piñas, Muntinlupa, Pateros
-- Clinic Codes: NCR3, NCR5, NC17, NC12, NCR8, NCR9, NC16

-- BUSINESS DISTRICTS COVERED:
-- ✅ Makati CBD (NCR3)
-- ✅ Bonifacio Global City/Taguig (NCR5)
-- ✅ Ortigas Center/Pasig (NCR4)
-- ✅ Araneta Center/Quezon City (NCR2)
-- ✅ Eastwood/Quezon City (NCR2)
-- ✅ Manila Bay Area/Manila (NCR1)

-- AIRPORT AREAS COVERED:
-- ✅ NAIA Terminals/Pasay (NC17)
-- ✅ NAIA Terminal 3/Parañaque (NC12)

-- ===========================================
-- IMPLEMENTATION STATUS
-- ===========================================
-- ✅ BEFORE: 9 NCR clinic codes (NCR1-NCR9)
-- ✅ AFTER:  17 NCR clinic codes (NCR1-NCR9, NC10-NC17)
-- ✅ COVERAGE: 100% of Metro Manila (All 16 cities + 1 municipality)
-- ✅ SCALABILITY: Ready for 10,000+ cards per area
-- ✅ DROPDOWN READY: All codes available in card activation interface