-- MOCARDS CLOUD - Region & Clinic Code Migration
-- Migration: Add MIMAROPA region and extend clinic codes to 016 range
-- Version: 4.1.0
-- Date: 2025-01-03

-- ============================================================================
-- REFERENCE TABLES FOR REGIONS AND CLINIC CODES
-- ============================================================================

-- Create regions reference table
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create clinic codes reference table
CREATE TABLE IF NOT EXISTS clinic_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    region_type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INSERT COMPLETE REGIONS DATA
-- ============================================================================

INSERT INTO regions (code, name, sort_order) VALUES
('01', 'Ilocos Region (Region 1)', 1),
('02', 'Cagayan Valley (Region 2)', 2),
('03', 'Central Luzon (Region 3)', 3),
('4A', 'Calabarzon (Region 4A)', 4),
('4B', 'Mimaropa (Region 4B)', 5),
('05', 'Bicol Region (Region 5)', 6),
('06', 'Western Visayas (Region 6)', 7),
('07', 'Central Visayas (Region 7)', 8),
('08', 'Eastern Visayas (Region 8)', 9),
('09', 'Zamboanga Peninsula (Region 9)', 10),
('10', 'Northern Mindanao (Region 10)', 11),
('11', 'Davao Region (Region 11)', 12),
('12', 'Soccsksargen (Region 12)', 13),
('13', 'Caraga Region (Region 13)', 14),
('NCR', 'National Capital Region (NCR)', 15),
('CAR', 'Cordillera Administrative Region (CAR)', 16),
('CUSTOM', 'Custom Region', 17)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- INSERT COMPLETE CLINIC CODES DATA (001 to 016 ranges)
-- ============================================================================

-- Central Valley Codes (CVT001 to CVT016)
INSERT INTO clinic_codes (code, region_type, description, sort_order) VALUES
('CVT001', 'Central Valley', 'Central Valley Clinic 001', 1),
('CVT002', 'Central Valley', 'Central Valley Clinic 002', 2),
('CVT003', 'Central Valley', 'Central Valley Clinic 003', 3),
('CVT004', 'Central Valley', 'Central Valley Clinic 004', 4),
('CVT005', 'Central Valley', 'Central Valley Clinic 005', 5),
('CVT006', 'Central Valley', 'Central Valley Clinic 006', 6),
('CVT007', 'Central Valley', 'Central Valley Clinic 007', 7),
('CVT008', 'Central Valley', 'Central Valley Clinic 008', 8),
('CVT009', 'Central Valley', 'Central Valley Clinic 009', 9),
('CVT010', 'Central Valley', 'Central Valley Clinic 010', 10),
('CVT011', 'Central Valley', 'Central Valley Clinic 011', 11),
('CVT012', 'Central Valley', 'Central Valley Clinic 012', 12),
('CVT013', 'Central Valley', 'Central Valley Clinic 013', 13),
('CVT014', 'Central Valley', 'Central Valley Clinic 014', 14),
('CVT015', 'Central Valley', 'Central Valley Clinic 015', 15),
('CVT016', 'Central Valley', 'Central Valley Clinic 016', 16),

-- Batangas Codes (BTG001 to BTG016)
('BTG001', 'Batangas', 'Batangas Clinic 001', 101),
('BTG002', 'Batangas', 'Batangas Clinic 002', 102),
('BTG003', 'Batangas', 'Batangas Clinic 003', 103),
('BTG004', 'Batangas', 'Batangas Clinic 004', 104),
('BTG005', 'Batangas', 'Batangas Clinic 005', 105),
('BTG006', 'Batangas', 'Batangas Clinic 006', 106),
('BTG007', 'Batangas', 'Batangas Clinic 007', 107),
('BTG008', 'Batangas', 'Batangas Clinic 008', 108),
('BTG009', 'Batangas', 'Batangas Clinic 009', 109),
('BTG010', 'Batangas', 'Batangas Clinic 010', 110),
('BTG011', 'Batangas', 'Batangas Clinic 011', 111),
('BTG012', 'Batangas', 'Batangas Clinic 012', 112),
('BTG013', 'Batangas', 'Batangas Clinic 013', 113),
('BTG014', 'Batangas', 'Batangas Clinic 014', 114),
('BTG015', 'Batangas', 'Batangas Clinic 015', 115),
('BTG016', 'Batangas', 'Batangas Clinic 016', 116),

-- Laguna Codes (LGN001 to LGN016)
('LGN001', 'Laguna', 'Laguna Clinic 001', 201),
('LGN002', 'Laguna', 'Laguna Clinic 002', 202),
('LGN003', 'Laguna', 'Laguna Clinic 003', 203),
('LGN004', 'Laguna', 'Laguna Clinic 004', 204),
('LGN005', 'Laguna', 'Laguna Clinic 005', 205),
('LGN006', 'Laguna', 'Laguna Clinic 006', 206),
('LGN007', 'Laguna', 'Laguna Clinic 007', 207),
('LGN008', 'Laguna', 'Laguna Clinic 008', 208),
('LGN009', 'Laguna', 'Laguna Clinic 009', 209),
('LGN010', 'Laguna', 'Laguna Clinic 010', 210),
('LGN011', 'Laguna', 'Laguna Clinic 011', 211),
('LGN012', 'Laguna', 'Laguna Clinic 012', 212),
('LGN013', 'Laguna', 'Laguna Clinic 013', 213),
('LGN014', 'Laguna', 'Laguna Clinic 014', 214),
('LGN015', 'Laguna', 'Laguna Clinic 015', 215),
('LGN016', 'Laguna', 'Laguna Clinic 016', 216),

-- MIMAROPA Codes (MIM001 to MIM016)
('MIM001', 'MIMAROPA', 'MIMAROPA Clinic 001', 301),
('MIM002', 'MIMAROPA', 'MIMAROPA Clinic 002', 302),
('MIM003', 'MIMAROPA', 'MIMAROPA Clinic 003', 303),
('MIM004', 'MIMAROPA', 'MIMAROPA Clinic 004', 304),
('MIM005', 'MIMAROPA', 'MIMAROPA Clinic 005', 305),
('MIM006', 'MIMAROPA', 'MIMAROPA Clinic 006', 306),
('MIM007', 'MIMAROPA', 'MIMAROPA Clinic 007', 307),
('MIM008', 'MIMAROPA', 'MIMAROPA Clinic 008', 308),
('MIM009', 'MIMAROPA', 'MIMAROPA Clinic 009', 309),
('MIM010', 'MIMAROPA', 'MIMAROPA Clinic 010', 310),
('MIM011', 'MIMAROPA', 'MIMAROPA Clinic 011', 311),
('MIM012', 'MIMAROPA', 'MIMAROPA Clinic 012', 312),
('MIM013', 'MIMAROPA', 'MIMAROPA Clinic 013', 313),
('MIM014', 'MIMAROPA', 'MIMAROPA Clinic 014', 314),
('MIM015', 'MIMAROPA', 'MIMAROPA Clinic 015', 315),
('MIM016', 'MIMAROPA', 'MIMAROPA Clinic 016', 316),

-- Special Codes
('Others', 'Special', 'Other Clinic Codes', 999),
('Custom', 'Special', 'Custom Clinic Codes', 1000)

ON CONFLICT (code) DO UPDATE SET
    region_type = EXCLUDED.region_type,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_sort ON regions(sort_order);

CREATE INDEX IF NOT EXISTS idx_clinic_codes_code ON clinic_codes(code);
CREATE INDEX IF NOT EXISTS idx_clinic_codes_region_type ON clinic_codes(region_type);
CREATE INDEX IF NOT EXISTS idx_clinic_codes_active ON clinic_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_codes_sort ON clinic_codes(sort_order);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS (OPTIONAL)
-- ============================================================================

-- Add constraint to clinics table to validate against regions table
-- ALTER TABLE clinics
-- ADD CONSTRAINT fk_clinics_region
-- FOREIGN KEY (region) REFERENCES regions(code);

-- Add constraint to clinics table to validate against clinic_codes table
-- ALTER TABLE clinics
-- ADD CONSTRAINT fk_clinics_code
-- FOREIGN KEY (code) REFERENCES clinic_codes(code);

-- ============================================================================
-- HELPFUL VIEWS FOR ADMINISTRATION
-- ============================================================================

-- View for active regions
CREATE OR REPLACE VIEW active_regions AS
SELECT code, name, sort_order
FROM regions
WHERE is_active = true
ORDER BY sort_order;

-- View for active clinic codes grouped by region
CREATE OR REPLACE VIEW active_clinic_codes AS
SELECT region_type, code, description, sort_order
FROM clinic_codes
WHERE is_active = true
ORDER BY region_type, sort_order;

-- View for available clinic codes per region
CREATE OR REPLACE VIEW clinic_codes_by_region AS
SELECT
    r.code as region_code,
    r.name as region_name,
    cc.code as clinic_code,
    cc.description as clinic_description,
    cc.region_type
FROM regions r
LEFT JOIN clinic_codes cc ON (
    (r.code = '4A' AND cc.region_type IN ('Central Valley', 'Batangas', 'Laguna')) OR
    (r.code = '4B' AND cc.region_type = 'MIMAROPA') OR
    (r.code NOT IN ('4A', '4B') AND cc.region_type = 'Special')
)
WHERE r.is_active = true AND (cc.is_active = true OR cc.is_active IS NULL)
ORDER BY r.sort_order, cc.sort_order;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT ON regions TO authenticated;
GRANT SELECT ON clinic_codes TO authenticated;
GRANT SELECT ON active_regions TO authenticated;
GRANT SELECT ON active_clinic_codes TO authenticated;
GRANT SELECT ON clinic_codes_by_region TO authenticated;

-- Grant access to anon users for public lookups
GRANT SELECT ON regions TO anon;
GRANT SELECT ON clinic_codes TO anon;
GRANT SELECT ON active_regions TO anon;
GRANT SELECT ON active_clinic_codes TO anon;
GRANT SELECT ON clinic_codes_by_region TO anon;

-- Migration completed successfully
-- New regions and clinic codes are now available in the database
-- Applications can now use the full range CVT001-CVT016, BTG001-BTG016, LGN001-LGN016, MIM001-MIM016