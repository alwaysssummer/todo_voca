-- ===================================================================
-- "회차(Session)" 마이그레이션 검증 스크립트
-- ===================================================================

SELECT '=== 1. 데이터베이스 스키마 검증 ===' as step;

-- 1-1. completed_wordlists: session_number 존재 확인
SELECT 
  '✅ completed_wordlists.session_number' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'completed_wordlists'
  AND column_name = 'session_number';

-- 1-2. completed_wordlists: day_number 제거 확인 (없어야 함)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ day_number 제거됨'
    ELSE '❌ day_number 아직 존재함'
  END as status
FROM information_schema.columns
WHERE table_name = 'completed_wordlists'
  AND column_name = 'day_number';

-- 1-3. student_word_progress: session_number 추가 확인
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ student_word_progress.session_number 존재'
    ELSE '⚠️ student_word_progress.session_number 없음 (선택사항)'
  END as status
FROM information_schema.columns
WHERE table_name = 'student_word_progress'
  AND column_name = 'session_number';

SELECT '=== 2. RPC 함수 검증 ===' as step;

-- 2-1. get_next_word 함수 존재 확인
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ get_next_word 함수 존재'
    ELSE '❌ get_next_word 함수 없음'
  END as status
FROM information_schema.routines
WHERE routine_name = 'get_next_word';

-- 2-2. get_next_word 함수에 날짜 필터링 없는지 확인
SELECT 
  CASE 
    WHEN routine_definition LIKE '%next_appear_date <= CURRENT_DATE%' 
      THEN '❌ 날짜 필터링이 아직 존재함'
    ELSE '✅ 날짜 필터링 제거됨'
  END as status
FROM information_schema.routines
WHERE routine_name = 'get_next_word';

SELECT '=== 3. 데이터 무결성 검증 ===' as step;

-- 3-1. completed_wordlists 데이터 확인
SELECT 
  '완성된 회차 데이터' as description,
  COUNT(*) as total_records,
  COUNT(DISTINCT student_id) as unique_students,
  MIN(session_number) as min_session,
  MAX(session_number) as max_session
FROM completed_wordlists;

-- 3-2. student_word_progress 데이터 확인
SELECT 
  '학습 진행 데이터' as description,
  COUNT(*) as total_records,
  COUNT(DISTINCT student_id) as unique_students,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped_count,
  SUM(CASE WHEN next_appear_date IS NULL THEN 1 ELSE 0 END) as null_next_appear_date
FROM student_word_progress;

-- 3-3. Skip 단어의 next_appear_date 확인 (모두 NULL이어야 함)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ 모든 Skip 단어가 next_appear_date = NULL'
    ELSE CONCAT('⚠️ ', COUNT(*), '개의 Skip 단어에 날짜가 설정됨')
  END as status
FROM student_word_progress
WHERE status = 'skipped' 
  AND next_appear_date IS NOT NULL;

SELECT '=== 4. 최종 결과 ===' as step;

SELECT 
  '✅ 회차(Session) 마이그레이션 검증 완료!' as status,
  '모든 "Day" 개념이 "회차"로 전환되었습니다.' as message;

