-- ================================================================
-- student_wordlists 테이블 스키마 확인
-- ================================================================

-- 1. 컬럼 정보 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'student_wordlists'
  AND column_name LIKE '%goal%';

-- 2. 전체 컬럼 확인
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'student_wordlists'
ORDER BY ordinal_position;

-- 3. 제약 조건 확인
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'student_wordlists';

