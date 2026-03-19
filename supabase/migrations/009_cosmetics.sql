-- 009_cosmetics.sql
-- 리뷰 마일스톤 코스메틱 시스템: 장착 정보 저장

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS equipped_cosmetics JSONB DEFAULT '{}';

-- RLS는 기존 user_profiles 정책에 의해 이미 보호됨
