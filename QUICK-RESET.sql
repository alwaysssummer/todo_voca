-- ===================================================================
-- 🚀 빠른 초기화 (모든 학생)
-- Supabase SQL Editor에 복사 & 붙여넣기 후 실행하세요!
-- ===================================================================

-- 1. 완료 단어장 삭제
DELETE FROM completed_wordlists;

-- 2. 단어 진행 상황 삭제
DELETE FROM student_word_progress;

-- 3. 온라인 테스트 삭제
DELETE FROM online_tests;

-- 4. 오프라인 테스트 삭제
DELETE FROM offline_tests;

-- 5. 2차, 3차 등 자동 생성된 단어장 삭제
DELETE FROM student_wordlists WHERE is_auto_generated = TRUE;

-- 6. 1차 단어장 초기화
UPDATE student_wordlists
SET 
  generation = 1,
  daily_goal = 50,
  filtered_word_ids = NULL,
  is_auto_generated = FALSE,
  base_wordlist_id = wordlist_id,
  parent_assignment_id = NULL
WHERE generation = 1 OR is_auto_generated = FALSE;

-- ✅ 완료 확인
SELECT 
  '✅ 초기화 완료!' as status,
  COUNT(*) as total_students
FROM users 
WHERE role = 'student';

SELECT 
  u.name as student_name,
  w.name as wordlist_name,
  sw.generation,
  sw.daily_goal,
  sw.is_auto_generated
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.base_wordlist_id = w.id
ORDER BY u.name;

