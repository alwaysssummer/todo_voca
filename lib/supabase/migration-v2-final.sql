-- ===================================================================
-- Todo Voca: 최종 세대별 단어장 시스템 마이그레이션 v2
-- 작성일: 2025-10-28
-- 목적: Day = daily_goal개 완료, Generation = 전체 단어 완료
-- ===================================================================

-- ===================================================================
-- STEP 1: 기존 UNIQUE 제약 조건 제거 (중요!)
-- ===================================================================
ALTER TABLE student_wordlists 
DROP CONSTRAINT IF EXISTS student_wordlists_student_id_wordlist_id_key;

-- ===================================================================
-- STEP 2: student_wordlists 테이블 확장
-- ===================================================================
ALTER TABLE student_wordlists 
ADD COLUMN IF NOT EXISTS base_wordlist_id UUID REFERENCES wordlists(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS generation INT DEFAULT 1 CHECK (generation > 0),
ADD COLUMN IF NOT EXISTS parent_assignment_id UUID REFERENCES student_wordlists(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS filtered_word_ids INT[],
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_goal INT DEFAULT 50 CHECK (daily_goal BETWEEN 20 AND 100),
ADD COLUMN IF NOT EXISTS generation_created_at TIMESTAMP WITH TIME ZONE;

-- ===================================================================
-- STEP 3: 기존 데이터 마이그레이션 (1차 단어장으로 설정)
-- ===================================================================
UPDATE student_wordlists 
SET 
  base_wordlist_id = COALESCE(base_wordlist_id, wordlist_id),
  generation = COALESCE(generation, 1),
  is_auto_generated = COALESCE(is_auto_generated, FALSE),
  generation_created_at = COALESCE(generation_created_at, assigned_at),
  daily_goal = COALESCE(daily_goal, 50)
WHERE base_wordlist_id IS NULL OR generation IS NULL;

-- ===================================================================
-- STEP 4: student_wordlists 인덱스 추가
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_student_wordlists_generation 
ON student_wordlists(student_id, generation);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_parent 
ON student_wordlists(parent_assignment_id);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_base 
ON student_wordlists(base_wordlist_id);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_auto 
ON student_wordlists(student_id, is_auto_generated);

-- ===================================================================
-- STEP 5: 새로운 UNIQUE 제약 조건 추가
-- ===================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_wordlists_unique_generation 
ON student_wordlists(student_id, base_wordlist_id, generation);

-- ===================================================================
-- STEP 6: completed_wordlists 테이블 확장
-- ===================================================================
ALTER TABLE completed_wordlists
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES student_wordlists(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS generation INT DEFAULT 1;

-- ===================================================================
-- STEP 7: 기존 completed_wordlists 데이터 마이그레이션
-- ===================================================================
UPDATE completed_wordlists cwl
SET 
  generation = COALESCE(generation, 1),
  assignment_id = COALESCE(
    assignment_id,
    (
      SELECT id FROM student_wordlists 
      WHERE student_id = cwl.student_id 
      AND wordlist_id = cwl.wordlist_id
      AND generation = 1
      LIMIT 1
    )
  )
WHERE generation IS NULL OR assignment_id IS NULL;

-- ===================================================================
-- STEP 8: completed_wordlists 인덱스 추가
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_completed_assignment 
ON completed_wordlists(assignment_id);

CREATE INDEX IF NOT EXISTS idx_completed_generation 
ON completed_wordlists(student_id, generation, day_number);

-- ===================================================================
-- STEP 9: 컬럼 설명 추가
-- ===================================================================
COMMENT ON COLUMN student_wordlists.base_wordlist_id IS '최초 원본 단어장 ID (1차부터 N차까지 동일)';
COMMENT ON COLUMN student_wordlists.generation IS '세대 번호 (1=원본, 2=1차복습, 3=2차복습, ...)';
COMMENT ON COLUMN student_wordlists.parent_assignment_id IS '이전 세대 assignment ID (NULL이면 1차)';
COMMENT ON COLUMN student_wordlists.filtered_word_ids IS '이 세대에 포함된 단어 ID 배열 (NULL이면 전체)';
COMMENT ON COLUMN student_wordlists.is_auto_generated IS '자동 생성 여부 (TRUE=시스템 생성, FALSE=강사 배정)';
COMMENT ON COLUMN student_wordlists.daily_goal IS '이 세대의 일일 학습 목표 (20-100개, Day 완료 기준)';

COMMENT ON COLUMN completed_wordlists.assignment_id IS '어느 assignment(세대)의 완료인지';
COMMENT ON COLUMN completed_wordlists.generation IS '세대 번호 (빠른 필터링용)';

-- ===================================================================
-- STEP 10: 검증 쿼리
-- ===================================================================
-- 마이그레이션 결과 확인
SELECT 
  '✅ student_wordlists 마이그레이션 완료!' as status,
  COUNT(*) as total_assignments,
  COUNT(*) FILTER (WHERE generation = 1) as generation_1_count,
  COUNT(*) FILTER (WHERE is_auto_generated = TRUE) as auto_generated_count
FROM student_wordlists;

SELECT 
  '✅ completed_wordlists 마이그레이션 완료!' as status,
  COUNT(*) as total_completed,
  COUNT(*) FILTER (WHERE assignment_id IS NOT NULL) as with_assignment_id
FROM completed_wordlists;

