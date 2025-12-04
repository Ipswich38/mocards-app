-- Fix passcode field length to support location-based passcodes
-- Location code (3 chars) + incomplete passcode (4 digits) = 7 characters total

-- Increase passcode field length to accommodate location-based passcodes
ALTER TABLE cards ALTER COLUMN passcode TYPE VARCHAR(10);