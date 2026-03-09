-- 008: Monthly publish limit
-- Add published_at timestamp to track when a board was published

ALTER TABLE badge_boards
  ADD COLUMN published_at timestamptz DEFAULT NULL;

-- Backfill: set published_at for already-published boards
UPDATE badge_boards
SET published_at = updated_at
WHERE is_public = true AND source_board_id IS NULL;
