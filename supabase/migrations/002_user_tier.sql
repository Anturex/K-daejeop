-- ============================================================
-- K-daejeop: 유저 등급(tier) 시스템
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── user_profiles에 tier 컬럼 추가 ──
-- tier: 'free' (기본), 'premium' (구독 유저)
-- 향후 등급별로 서비스 차별화 (광고 제거, 추천 맛집 조기 해금 등)
alter table public.user_profiles
  add column if not exists tier text default 'free' not null;

-- 기존 유저들도 'free' 등급으로 설정 (default이므로 자동 적용)
-- 명시적 업데이트 (NULL 방지)
update public.user_profiles set tier = 'free' where tier is null;
