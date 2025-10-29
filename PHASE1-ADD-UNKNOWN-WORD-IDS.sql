-- Phase 1: DB 스키마 변경
-- completed_wordlists 테이블에 unknown_word_ids 컬럼 추가

-- 1. 컬럼 추가 (NULL 허용으로 안전하게)
ALTER TABLE completed_wordlists
ADD COLUMN IF NOT EXISTS unknown_word_ids INTEGER[];

-- 2. 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'completed_wordlists'
  AND column_name IN ('word_ids', 'unknown_word_ids')
ORDER BY ordinal_position;

-- 3. 기존 데이터 확인
SELECT 
  id,
  day_number,
  word_ids,
  unknown_word_ids,
  completed_date
FROM completed_wordlists
ORDER BY completed_date DESC
LIMIT 5;

-- 4. 결과 요약
SELECT 
  '=== Phase 1 완료 ===' as status,
  'unknown_word_ids 컬럼 추가됨' as description,
  '기존 데이터는 NULL 상태' as note;

