-- ===================================================================
-- 마이그레이션 검증 쿼리
-- Supabase SQL Editor에서 실행하세요
-- ===================================================================

-- 1. student_wordlists 컬럼 확인
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_wordlists' 
  AND column_name IN (
    'base_wordlist_id', 
    'generation', 
    'parent_assignment_id', 
    'filtered_word_ids', 
    'daily_goal',
    'is_auto_generated'
  )
ORDER BY column_name;

-- 예상 결과: 6개 컬럼 모두 존재

-- 2. 현재 student_wordlists 데이터 확인
SELECT 
  sw.id,
  u.name as student_name,
  w.name as wordlist_name,
  sw.generation,
  sw.daily_goal,
  sw.is_auto_generated,
  COALESCE(array_length(sw.filtered_word_ids, 1), 0) as filtered_count,
  sw.assigned_at
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.base_wordlist_id = w.id
ORDER BY u.name, sw.generation;

-- 예상 결과: 각 학생이 generation=1, daily_goal=50으로 설정

-- 3. completed_wordlists 컬럼 확인
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'completed_wordlists' 
  AND column_name IN ('assignment_id', 'generation')
ORDER BY column_name;

-- 예상 결과: 2개 컬럼 모두 존재

-- 4. 완료된 단어 확인
SELECT 
  u.name as student_name,
  COUNT(*) as completed_words,
  MAX(swp.completed_date) as last_completed
FROM student_word_progress swp
JOIN users u ON swp.student_id = u.id
WHERE swp.status = 'completed'
GROUP BY u.name;

-- 5. UNIQUE 제약 조건 확인
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'student_wordlists'::regclass
  AND contype = 'u';

-- 예상 결과: idx_student_wordlists_unique_generation 존재

