-- 006: 공개 뱃지판 배포자의 리뷰 조회 함수
-- 배포된(is_public=true) 뱃지판의 배포자 리뷰를 RLS 우회하여 안전하게 노출

CREATE OR REPLACE FUNCTION get_board_creator_reviews(board_id_param uuid)
RETURNS SETOF reviews
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.*
  FROM reviews r
  INNER JOIN badge_boards bb ON bb.creator_id = r.user_id
  INNER JOIN badge_board_places bbp ON bbp.board_id = bb.id AND bbp.place_id = r.place_id
  WHERE bb.id = board_id_param
  AND bb.is_public = true
$$;
