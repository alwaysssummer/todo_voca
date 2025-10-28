-- ===================================================================
-- 학생 진행 상황 초기화 (테스트용)
-- Supabase SQL Editor에서 실행하세요
-- ===================================================================

-- ⚠️ 주의: 이 스크립트는 모든 학생의 학습 진행 상황을 삭제합니다!

-- 1. 학생 ID 확인 (먼저 실행해서 확인)
SELECT id, name, access_token 
FROM users 
WHERE role = 'student';

-- 2. 특정 학생의 진행 상황만 초기화 (예: 이영희)
-- 아래 UUID를 실제 학생 ID로 변경하세요
DO $$
DECLARE
  v_student_id UUID := '10000002-0000-0000-0000-000000000002'; -- 이영희
BEGIN
  -- 완료 단어장 삭제
  DELETE FROM completed_wordlists WHERE student_id = v_student_id;
  
  -- 단어 진행 상황 삭제
  DELETE FROM student_word_progress WHERE student_id = v_student_id;
  
  -- 온라인 테스트 삭제
  DELETE FROM online_tests WHERE student_id = v_student_id;
  
  -- 2차, 3차 등 자동 생성된 단어장 삭제
  DELETE FROM student_wordlists 
  WHERE student_id = v_student_id 
    AND is_auto_generated = TRUE;
  
  -- 1차 단어장 초기화 (generation=1, daily_goal=50으로 설정)
  UPDATE student_wordlists
  SET 
    generation = 1,
    daily_goal = 50,
    filtered_word_ids = NULL,
    is_auto_generated = FALSE
  WHERE student_id = v_student_id 
    AND generation = 1;
  
  RAISE NOTICE '✅ 학생 진행 상황 초기화 완료!';
END $$;

-- 3. 초기화 확인
SELECT 
  u.name,
  COUNT(DISTINCT swp.id) as progress_count,
  COUNT(DISTINCT cwl.id) as completed_wordlist_count,
  COUNT(DISTINCT sw.id) as assignment_count
FROM users u
LEFT JOIN student_word_progress swp ON u.id = swp.student_id
LEFT JOIN completed_wordlists cwl ON u.id = cwl.student_id
LEFT JOIN student_wordlists sw ON u.id = sw.student_id
WHERE u.role = 'student' AND u.id = '10000002-0000-0000-0000-000000000002'
GROUP BY u.name;

-- 예상 결과: progress_count=0, completed_wordlist_count=0, assignment_count=1

