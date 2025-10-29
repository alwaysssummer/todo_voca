-- 빠른 초기화: 테스트학생100을 완전히 리셋

-- 1. 모든 진행 상태 삭제
DELETE FROM student_word_progress 
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid;

-- 2. 완성 단어장 삭제 (올바른 컬럼명 사용)
DELETE FROM completed_wordlists 
WHERE assignment_id = '33333333-4444-5555-6666-100000000001'::uuid;

-- 3. 배정 정보 초기화 (1차 세대로 리셋)
UPDATE student_wordlists
SET 
  generation = 1,
  filtered_word_ids = NULL,
  is_auto_generated = false,
  assigned_at = NOW()
WHERE id = '33333333-4444-5555-6666-100000000001'::uuid;

-- 4. 자동생성된 2차 세대 배정 삭제 (있다면)
DELETE FROM student_wordlists
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid
  AND wordlist_id = 'aaaaaaaa-bbbb-cccc-dddd-100000000001'::uuid
  AND is_auto_generated = true;

-- 5. 확인
SELECT '=== 초기화 완료! ===' as status;

SELECT 
  'Progress Count: ' || COUNT(*)::text as info
FROM student_word_progress 
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid
UNION ALL
SELECT 
  'Completed Wordlists Count: ' || COUNT(*)::text
FROM completed_wordlists 
WHERE assignment_id = '33333333-4444-5555-6666-100000000001'::uuid
UNION ALL
SELECT 
  'Assignment Generation: ' || generation::text
FROM student_wordlists
WHERE id = '33333333-4444-5555-6666-100000000001'::uuid;
