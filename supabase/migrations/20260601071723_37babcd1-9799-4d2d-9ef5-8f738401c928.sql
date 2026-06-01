-- Add new status 'cancelled' to spare_part_status enum
ALTER TYPE public.spare_part_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add columns to spare_parts for purpose and cancellation/return reason
ALTER TABLE public.spare_parts
  ADD COLUMN IF NOT EXISTS part_purpose text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;
