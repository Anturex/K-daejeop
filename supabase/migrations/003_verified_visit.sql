-- Add verified_visit column to reviews (default false)
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS verified_visit boolean DEFAULT false;
