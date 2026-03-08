-- ============================================================
-- K-daejeop: rating 0 허용 (✕ "다시는 안 갈 곳")
-- 기존 CHECK constraint가 1~3만 허용 → 0~3으로 변경
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 0 AND 3);
