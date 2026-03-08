-- 005: Badge Board System
-- 뱃지판(Badge Board) 시스템: 장소 모음을 정의하고 모두 방문하면 뱃지 획득

-- 1) share_code 생성 함수
CREATE OR REPLACE FUNCTION generate_share_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 2) 뱃지판 정의
CREATE TABLE public.badge_boards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  icon_emoji text DEFAULT '🏆',
  is_public boolean DEFAULT true,
  share_code text UNIQUE DEFAULT generate_share_code(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) 뱃지판에 속한 장소들
CREATE TABLE public.badge_board_places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES public.badge_boards(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  place_name text NOT NULL,
  place_address text DEFAULT '',
  place_category text DEFAULT '',
  place_x text DEFAULT '',
  place_y text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(board_id, place_id)
);

-- 4) 유저의 뱃지 획득 기록
CREATE TABLE public.user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.badge_boards(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, board_id)
);

-- 5) 인덱스
CREATE INDEX idx_badge_boards_creator ON badge_boards(creator_id);
CREATE INDEX idx_badge_boards_share_code ON badge_boards(share_code);
CREATE INDEX idx_badge_boards_public ON badge_boards(is_public) WHERE is_public = true;
CREATE INDEX idx_badge_board_places_board ON badge_board_places(board_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- 6) RLS 활성화 및 정책

-- badge_boards
ALTER TABLE badge_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY boards_select ON badge_boards FOR SELECT USING (
  is_public = true OR auth.uid() = creator_id
);
CREATE POLICY boards_insert ON badge_boards FOR INSERT WITH CHECK (
  auth.uid() = creator_id
);
CREATE POLICY boards_update ON badge_boards FOR UPDATE USING (
  auth.uid() = creator_id
);
CREATE POLICY boards_delete ON badge_boards FOR DELETE USING (
  auth.uid() = creator_id
);

-- badge_board_places
ALTER TABLE badge_board_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY places_select ON badge_board_places FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM badge_boards b
    WHERE b.id = board_id AND (b.is_public = true OR b.creator_id = auth.uid())
  )
);
CREATE POLICY places_insert ON badge_board_places FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM badge_boards b
    WHERE b.id = board_id AND b.creator_id = auth.uid()
  )
);
CREATE POLICY places_delete ON badge_board_places FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM badge_boards b
    WHERE b.id = board_id AND b.creator_id = auth.uid()
  )
);

-- user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY badges_select ON user_badges FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY badges_insert ON user_badges FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
