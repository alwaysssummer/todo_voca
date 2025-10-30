-- ===================================================================
-- Todo Voca: online_tests 테이블 test_type 컬럼 추가
-- 작성일: 2025-10-30
-- 목적: O-TEST(아는 단어)와 X-TEST(모르는 단어) 구분
-- ===================================================================

-- ===================================================================
-- STEP 1: test_type 컬럼 추가
-- ===================================================================
ALTER TABLE online_tests
ADD COLUMN IF NOT EXISTS test_type TEXT CHECK (test_type IN ('known', 'unknown'));

-- ===================================================================
-- STEP 2: 기존 데이터 확인
-- ===================================================================
SELECT 
  id,
  completed_wordlist_id,
  test_type,
  correct_count,
  total_questions,
  score,
  test_date
FROM online_tests
ORDER BY test_date DESC
LIMIT 10;

-- ===================================================================
-- STEP 3: 인덱스 추가 (성능 최적화)
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_online_tests_type 
ON online_tests(completed_wordlist_id, test_type);

-- ===================================================================
-- STEP 4: 컬럼 설명 추가
-- ===================================================================
COMMENT ON COLUMN online_tests.test_type IS 'O-TEST(known) 또는 X-TEST(unknown) 구분';

-- ===================================================================
-- 검증: test_type별 통계
-- ===================================================================
SELECT 
  test_type,
  COUNT(*) as test_count,
  AVG(score) as avg_score,
  AVG(correct_count::FLOAT / NULLIF(total_questions, 0) * 100) as avg_accuracy
FROM online_tests
WHERE test_type IS NOT NULL
GROUP BY test_type;

