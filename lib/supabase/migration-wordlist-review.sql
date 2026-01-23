-- 단어장 복습 구분을 위한 마이그레이션
-- 실행 방법: Supabase SQL Editor에서 실행

-- 1. wordlists 테이블에 복습 단어장 구분 컬럼 추가
ALTER TABLE wordlists ADD COLUMN IF NOT EXISTS is_review BOOLEAN DEFAULT FALSE;
ALTER TABLE wordlists ADD COLUMN IF NOT EXISTS source_wordlist_id UUID REFERENCES wordlists(id) ON DELETE SET NULL;
ALTER TABLE wordlists ADD COLUMN IF NOT EXISTS created_for_student_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_wordlists_is_review ON wordlists(is_review);
CREATE INDEX IF NOT EXISTS idx_wordlists_source ON wordlists(source_wordlist_id);
CREATE INDEX IF NOT EXISTS idx_wordlists_created_for ON wordlists(created_for_student_id);

-- 3. 기존 복습 단어장 마이그레이션 (이름 패턴으로 식별)
-- 패턴: "[학생명] - [원본 단어장명] 복습 (N개)"
UPDATE wordlists
SET is_review = TRUE
WHERE name LIKE '% 복습 (%개)';

-- 4. 확인 쿼리
-- SELECT id, name, is_review, source_wordlist_id, created_for_student_id
-- FROM wordlists
-- ORDER BY is_review DESC, created_at DESC;
