-- ===================================================================
-- ELIMINATE PASSCODE COMPLETELY - PRODUCTION FIX
-- ===================================================================
-- This script completely removes passcode dependency from the system
-- Execute this in Supabase SQL Editor to fix the NOT NULL constraint

-- 1. First, make passcode nullable if it's not already
ALTER TABLE public.cards ALTER COLUMN passcode DROP NOT NULL;

-- 2. Set default to NULL
ALTER TABLE public.cards ALTER COLUMN passcode SET DEFAULT NULL;

-- 3. Option A: Set all existing passcodes to NULL (if you want to remove completely)
-- UPDATE public.cards SET passcode = NULL;

-- 4. Option B: Keep existing passcodes but allow NULL for new cards (recommended)
-- (No action needed - existing cards keep their passcodes, new ones can be NULL)

-- 5. Update the schema for future deployments
-- Make sure the cards table definition allows NULL passcode

-- Verification queries
SELECT
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'cards'
AND column_name = 'passcode';

-- Check current card count
SELECT COUNT(*) as total_cards FROM public.cards;

-- Check how many cards have passcode vs NULL
SELECT
  COUNT(CASE WHEN passcode IS NULL THEN 1 END) as null_passcodes,
  COUNT(CASE WHEN passcode IS NOT NULL THEN 1 END) as with_passcodes,
  COUNT(*) as total
FROM public.cards;