-- 마지막 회차 Skip 단어 X-TEST 미반영 버그 수정
-- 문제: 마지막 회차에서 skip한 단어가 나중에 "안다"로 바뀌면 unknown_word_ids에 포함되지 않음
-- 해결: skip한 회차를 별도 필드로 추적

-- 1. last_skipped_session 컬럼 추가
ALTER TABLE student_word_progress
ADD COLUMN IF NOT EXISTS last_skipped_session INT DEFAULT 0;

-- 2. 기존 skip 데이터 마이그레이션 (현재 skipped 상태인 단어에 대해)
UPDATE student_word_progress
SET last_skipped_session = last_studied_session
WHERE status = 'skipped' AND (last_skipped_session IS NULL OR last_skipped_session = 0);

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_progress_last_skipped_session
ON student_word_progress(student_id, last_skipped_session);
