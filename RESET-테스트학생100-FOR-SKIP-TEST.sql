-- 테스트학생100 초기화: Skip 혼합 테스트를 위한 준비

-- 1. 진행 상태 완전 초기화
DELETE FROM student_word_progress 
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid;

DELETE FROM completed_wordlists 
WHERE student_wordlist_id = '33333333-4444-5555-6666-100000000001'::uuid;

-- 2. 배정 정보 초기화
UPDATE student_wordlists
SET 
  generation = 1,
  filtered_word_ids = NULL,
  is_auto_generated = false
WHERE id = '33333333-4444-5555-6666-100000000001'::uuid;

-- 3. 확인
SELECT '=== 초기화 완료 ===' as status;

SELECT 
  u.name as student_name,
  w.name as wordlist_name,
  sw.generation,
  sw.daily_goal,
  (SELECT COUNT(*) FROM student_word_progress WHERE student_id = u.id) as progress_count,
  (SELECT COUNT(*) FROM completed_wordlists WHERE student_wordlist_id = sw.id) as completed_count
FROM users u
JOIN student_wordlists sw ON u.id = sw.student_id
JOIN wordlists w ON sw.wordlist_id = w.id
WHERE u.id = '11111111-2222-3333-4444-100000000001'::uuid;

