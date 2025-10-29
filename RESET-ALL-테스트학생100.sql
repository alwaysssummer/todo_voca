-- 전체 초기화: 테스트학생100의 모든 데이터를 완전히 리셋
-- (자동 생성된 복습 단어장도 모두 삭제)

DO $$
DECLARE
  test_student_id UUID := '11111111-2222-3333-4444-100000000001';
  test_assignment_id UUID := '33333333-4444-5555-6666-100000000001';
  original_wordlist_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-100000000001';
BEGIN
  -- 1. 학생의 모든 진행 상태 삭제
  DELETE FROM student_word_progress 
  WHERE student_id = test_student_id;

  -- 2. 학생의 모든 완성 단어장 삭제
  DELETE FROM completed_wordlists 
  WHERE assignment_id IN (
    SELECT id FROM student_wordlists WHERE student_id = test_student_id
  );

  -- 3. 학생의 모든 평가 기록 삭제
  DELETE FROM online_tests
  WHERE student_id = test_student_id;

  -- 4. 자동 생성된 복습 단어장의 words 삭제
  DELETE FROM words
  WHERE wordlist_id IN (
    SELECT wordlist_id FROM student_wordlists 
    WHERE student_id = test_student_id 
      AND is_auto_generated = true
      AND wordlist_id != original_wordlist_id
  );

  -- 5. 자동 생성된 복습 단어장 삭제
  DELETE FROM wordlists
  WHERE id IN (
    SELECT wordlist_id FROM student_wordlists 
    WHERE student_id = test_student_id 
      AND is_auto_generated = true
      AND wordlist_id != original_wordlist_id
  )
  AND name LIKE '%복습%';

  -- 6. 자동 생성된 배정 삭제
  DELETE FROM student_wordlists
  WHERE student_id = test_student_id
    AND id != test_assignment_id;

  -- 7. 원본 배정을 1차 세대로 리셋
  UPDATE student_wordlists
  SET 
    generation = 1,
    filtered_word_ids = NULL,
    parent_assignment_id = NULL,
    is_auto_generated = false,
    assigned_at = NOW()
  WHERE id = test_assignment_id;

  RAISE NOTICE '✅ 테스트학생100 전체 초기화 완료!';
END $$;

-- 확인
SELECT '=== 초기화 완료! ===' as status;

SELECT 
  'Progress Count' as type,
  COUNT(*)::text as value
FROM student_word_progress 
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid
UNION ALL
SELECT 
  'Completed Wordlists',
  COUNT(*)::text
FROM completed_wordlists 
WHERE assignment_id IN (
  SELECT id FROM student_wordlists 
  WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid
)
UNION ALL
SELECT 
  'Online Tests',
  COUNT(*)::text
FROM online_tests
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid
UNION ALL
SELECT 
  'Assignments',
  COUNT(*)::text
FROM student_wordlists
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid
UNION ALL
SELECT 
  'Review Wordlists',
  COUNT(*)::text
FROM wordlists
WHERE name LIKE '%테스트학생100%복습%';

-- 남은 배정 확인
SELECT 
  id,
  wordlist_id,
  generation,
  daily_goal,
  is_auto_generated,
  filtered_word_ids
FROM student_wordlists
WHERE student_id = '11111111-2222-3333-4444-100000000001'::uuid
ORDER BY generation;

