-- ===================================================================
-- Todo Voca: 세대별 단어장 시스템 마이그레이션
-- 작성일: 2025-10-28
-- 목적: 1차→2차→3차... 자동 생성 복습 단어장 시스템
-- ===================================================================

-- 1. student_wordlists 테이블에 세대 관련 컬럼 추가
ALTER TABLE student_wordlists 
ADD COLUMN IF NOT EXISTS base_wordlist_id UUID REFERENCES wordlists(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS generation INT DEFAULT 1 CHECK (generation > 0),
ADD COLUMN IF NOT EXISTS parent_assignment_id UUID REFERENCES student_wordlists(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS filtered_word_ids INT[],
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS generation_created_at TIMESTAMP WITH TIME ZONE;

-- 2. 기존 데이터 마이그레이션 (1차 단어장으로 설정)
UPDATE student_wordlists 
SET 
  base_wordlist_id = wordlist_id,
  generation = 1,
  is_auto_generated = FALSE,
  generation_created_at = assigned_at
WHERE base_wordlist_id IS NULL;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_student_wordlists_generation 
ON student_wordlists(student_id, generation);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_parent 
ON student_wordlists(parent_assignment_id);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_base 
ON student_wordlists(base_wordlist_id);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_auto 
ON student_wordlists(student_id, is_auto_generated);

-- 4. 제약 조건 추가
-- 학생당 같은 base_wordlist_id와 generation 조합은 유일해야 함
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_wordlists_unique_generation 
ON student_wordlists(student_id, base_wordlist_id, generation);

-- 5. 설명용 주석 추가
COMMENT ON COLUMN student_wordlists.base_wordlist_id IS '최초 원본 단어장 ID (1차부터 N차까지 동일)';
COMMENT ON COLUMN student_wordlists.generation IS '세대 번호 (1=원본, 2=1차복습, 3=2차복습, ...)';
COMMENT ON COLUMN student_wordlists.parent_assignment_id IS '이전 세대 assignment ID (NULL이면 1차)';
COMMENT ON COLUMN student_wordlists.filtered_word_ids IS '이 세대에 포함된 단어 ID 배열 (NULL이면 전체)';
COMMENT ON COLUMN student_wordlists.is_auto_generated IS '자동 생성 여부 (TRUE=시스템 생성, FALSE=강사 배정)';

-- 완료 메시지
SELECT 
  '✅ 세대별 단어장 시스템 마이그레이션 완료!' as status,
  COUNT(*) as migrated_assignments
FROM student_wordlists 
WHERE generation = 1;

