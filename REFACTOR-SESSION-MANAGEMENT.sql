-- ===================================================================
-- 회차 관리 시스템 리팩토링
-- 목적: 복잡한 계산 로직 제거, 명시적 회차 번호 관리
-- ===================================================================

-- Step 1: student_wordlists에 current_session 컬럼 추가
ALTER TABLE student_wordlists 
ADD COLUMN IF NOT EXISTS current_session INT DEFAULT 1;

-- Step 2: 기존 데이터 마이그레이션 (완료된 회차 수 + 1)
UPDATE student_wordlists sw
SET current_session = (
  SELECT COALESCE(MAX(cw.session_number), 0) + 1
  FROM completed_wordlists cw
  WHERE cw.assignment_id = sw.id
)
WHERE current_session = 1;  -- 초기값인 경우만 업데이트

-- Step 3: 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_student_wordlists_current_session 
ON student_wordlists(student_id, current_session);

-- Step 4: 검증 쿼리
SELECT 
  sw.id,
  u.name as student_name,
  w.name as wordlist_name,
  sw.current_session,
  sw.daily_goal as session_goal,
  (SELECT COUNT(*) FROM completed_wordlists WHERE assignment_id = sw.id) as completed_sessions
FROM student_wordlists sw
JOIN users u ON u.id = sw.student_id
JOIN wordlists w ON w.id = sw.wordlist_id
ORDER BY u.name, sw.current_session;

SELECT '✅ current_session 컬럼 추가 및 초기화 완료!' as status;

