-- ===================================================================
-- Phase 1: last_studied_session 컬럼 추가
-- 목적: 회차 기반으로 Skip 단어 재등장 관리
-- ===================================================================

-- 1. student_word_progress 테이블에 last_studied_session 컬럼 추가
ALTER TABLE student_word_progress
ADD COLUMN IF NOT EXISTS last_studied_session INT DEFAULT 0;

-- 2. 컬럼 설명
COMMENT ON COLUMN student_word_progress.last_studied_session IS 
'마지막으로 학습한 회차 번호. 0=미학습, 1=1회차, 2=2회차...';

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_swp_last_studied_session 
ON student_word_progress(student_id, last_studied_session);

-- 4. 기존 데이터 마이그레이션 (completed_date 기준으로 회차 추정)
-- 주의: 정확하지 않을 수 있으므로, 필요시 0으로 초기화 권장
UPDATE student_word_progress
SET last_studied_session = 0
WHERE last_studied_session IS NULL;

-- 5. 확인
SELECT 
    'last_studied_session 컬럼 추가 완료!' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN last_studied_session = 0 THEN 1 END) as not_studied_yet,
    COUNT(CASE WHEN last_studied_session > 0 THEN 1 END) as studied
FROM student_word_progress;

