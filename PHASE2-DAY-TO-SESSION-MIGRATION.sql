-- ================================================================
-- Phase 2: "Day" → "회차(Session)" 전환
-- ================================================================

-- 1. completed_wordlists 테이블: day_number → session_number 변경
ALTER TABLE completed_wordlists 
RENAME COLUMN day_number TO session_number;

-- 2. student_word_progress 테이블: session_number 컬럼 추가
ALTER TABLE student_word_progress 
ADD COLUMN session_number INT;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX idx_progress_session 
ON student_word_progress(student_id, session_number);

-- 4. 기존 completed_wordlists 인덱스 재생성 (필요시)
-- DROP INDEX IF EXISTS idx_completed_day;
-- CREATE INDEX idx_completed_session ON completed_wordlists(student_id, session_number);

-- 5. 확인
SELECT 'Migration completed successfully!' AS message;
SELECT 'session_number column added to student_word_progress' AS info;
SELECT 'day_number renamed to session_number in completed_wordlists' AS info;

