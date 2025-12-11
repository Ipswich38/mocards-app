-- Fix passcode constraint and prepare for 10,000 card generation
-- This removes the passcode requirement as requested

-- 1. Make passcode column nullable (remove NOT NULL constraint)
ALTER TABLE cards ALTER COLUMN passcode DROP NOT NULL;

-- 2. Set a default value for passcode (empty string or NULL)
ALTER TABLE cards ALTER COLUMN passcode SET DEFAULT NULL;

-- 3. Delete all existing cards (the 1005 cards)
DELETE FROM cards WHERE migration_version IS NULL OR migration_version < 2;

-- 4. Reset any sequences if they exist
-- (This ensures clean numbering for the new 10,000 cards)

-- Verification query to check remaining cards
SELECT COUNT(*) as remaining_cards FROM cards;