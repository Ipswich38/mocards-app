-- Update demo clinic password to use bcrypt hash for 'demo123'
-- This is the bcrypt hash for 'demo123' with salt rounds 10
UPDATE mocards.clinics
SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE clinic_code = 'DEMO001';

-- Verify the update

SELECT 'Updated Demo Clinic Password:' as status,
       clinic_code,
       clinic_name,
       SUBSTRING(password_hash, 1, 20) || '...' as password_hash_preview
FROM mocards.clinics
WHERE clinic_code = 'DEMO001';