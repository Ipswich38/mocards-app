-- ===================================================================
-- FIX PASSCODE NOT NULL CONSTRAINT - PRODUCTION URGENT FIX
-- ===================================================================
-- This removes the passcode requirement from the cards table
-- Execute this in Supabase SQL Editor immediately

-- 1. Make passcode column nullable
ALTER TABLE public.cards ALTER COLUMN passcode DROP NOT NULL;

-- 2. Set default value to NULL (optional)
ALTER TABLE public.cards ALTER COLUMN passcode SET DEFAULT NULL;

-- 3. Update any existing cards with empty passcode to NULL
UPDATE public.cards SET passcode = NULL WHERE passcode = '' OR passcode IS NULL;

-- Verification query
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cards'
AND column_name = 'passcode';

-- Check card count
SELECT COUNT(*) as total_cards FROM public.cards;