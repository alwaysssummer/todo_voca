-- ===================================================================
-- Todo Voca: completed_wordlists UNIQUE 제약 추가
-- 작성일: 2025-10-28
-- 목적: 같은 assignment의 같은 day_number 중복 방지
-- ===================================================================

-- ===================================================================
-- STEP 1: 기존 중복 데이터 확인
-- ===================================================================
SELECT 
  assignment_id, 
  day_number, 
  completed_date, 
  COUNT(*) as duplicate_count
FROM completed_wordlists
GROUP BY assignment_id, day_number, completed_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ===================================================================
-- STEP 2: 중복 데이터 제거 (있다면)
-- ===================================================================
-- 중복된 경우 가장 먼저 생성된 것만 남기고 삭제
DELETE FROM completed_wordlists
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY assignment_id, day_number, completed_date 
             ORDER BY created_at ASC
           ) as rn
    FROM completed_wordlists
  ) t
  WHERE t.rn > 1
);

-- ===================================================================
-- STEP 3: UNIQUE 제약 추가
-- ===================================================================
ALTER TABLE completed_wordlists 
ADD CONSTRAINT unique_assignment_day_date 
UNIQUE (assignment_id, day_number, completed_date);

-- ===================================================================
-- STEP 4: 인덱스 최적화
-- ===================================================================
-- 기존 인덱스 확인 및 최적화
CREATE INDEX IF NOT EXISTS idx_completed_assignment_day 
ON completed_wordlists(assignment_id, day_number);

CREATE INDEX IF NOT EXISTS idx_completed_date_status 
ON completed_wordlists(completed_date, online_test_completed);

-- ===================================================================
-- STEP 5: 검증
-- ===================================================================
-- UNIQUE 제약이 제대로 추가되었는지 확인
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'completed_wordlists'::regclass
  AND conname = 'unique_assignment_day_date';

-- 성공 메시지
SELECT '✅ completed_wordlists UNIQUE 제약 추가 완료!' as status;

