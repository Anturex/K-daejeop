-- 007: Saved Boards (뱃지판 저장/공유 확장)
-- source_board_id / source_creator_id 추가 + RPC 함수 3개

-- 1) badge_boards에 소스 추적 컬럼 추가
ALTER TABLE badge_boards
  ADD COLUMN source_board_id uuid DEFAULT NULL,
  ADD COLUMN source_creator_id uuid DEFAULT NULL;

CREATE INDEX idx_badge_boards_source ON badge_boards(source_board_id)
  WHERE source_board_id IS NOT NULL;

-- 2) RPC: 공유코드로 보드 검색 (SECURITY DEFINER → RLS 우회, 비공개 보드도 검색 가능)
CREATE OR REPLACE FUNCTION find_board_by_code(code_param text)
RETURNS SETOF badge_boards
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM badge_boards
  WHERE share_code = upper(trim(code_param))
  AND source_board_id IS NULL
  LIMIT 1;
$$;

-- 3) RPC: 보드 ID로 장소 목록 조회 (SECURITY DEFINER → RLS 우회)
CREATE OR REPLACE FUNCTION get_board_places_by_id(board_id_param uuid)
RETURNS SETOF badge_board_places
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM badge_board_places
  WHERE board_id = board_id_param
  ORDER BY sort_order;
$$;

-- 4) RPC: 유저 ID + 장소 ID 배열로 리뷰 조회 (원본 보드 존재와 무관)
CREATE OR REPLACE FUNCTION get_creator_reviews_by_user_places(
  creator_id_param uuid,
  place_ids_param text[]
)
RETURNS SETOF reviews
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM reviews
  WHERE user_id = creator_id_param
  AND place_id = ANY(place_ids_param);
$$;
