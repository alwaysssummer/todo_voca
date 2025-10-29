-- ============================================
-- Day 4 = 9개 문제 진단 SQL
-- ============================================
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 전체 완성 단어장 현황 조회
SELECT 
  id,
  day_number,
  generation,
  word_ids,
  array_length(word_ids, 1) as word_count,
  completed_date,
  created_at,
  online_test_completed
FROM completed_wordlists
WHERE student_id = '10000000-0000-0000-0000-000000000001'  -- 김철수
ORDER BY generation, day_number;

-- ============================================
-- 2. Day 4 상세 분석
-- ============================================
SELECT 
  day_number,
  word_ids,
  array_length(word_ids, 1) as count,
  completed_date,
  created_at
FROM completed_wordlists
WHERE student_id = '10000000-0000-0000-0000-000000000001'
  AND day_number = 4;

-- ============================================
-- 3. Day 4의 단어 ID 확인
-- ============================================
-- Day 4에 포함된 단어들의 실제 내용 확인
SELECT 
  w.id,
  w.sequence_order,
  w.word_text,
  w.meaning
FROM words w
WHERE w.id = ANY(
  SELECT unnest(word_ids) 
  FROM completed_wordlists 
  WHERE student_id = '10000000-0000-0000-0000-000000000001'
    AND day_number = 4
)
ORDER BY w.sequence_order;

-- ============================================
-- 4. 40번 단어 상태 확인
-- ============================================
SELECT 
  w.id,
  w.sequence_order,
  w.word_text,
  w.meaning,
  swp.status,
  swp.skip_count,
  swp.completed_date
FROM words w
LEFT JOIN student_word_progress swp 
  ON w.id = swp.word_id 
  AND swp.student_id = '10000000-0000-0000-0000-000000000001'
WHERE w.sequence_order = 40
  AND w.wordlist_id = '20000000-0000-0000-0000-000000000001';

-- ============================================
-- 5. 전체 진행 상황 (1~50번)
-- ============================================
SELECT 
  w.sequence_order,
  w.word_text,
  COALESCE(swp.status, 'not_started') as status,
  swp.skip_count,
  swp.completed_date,
  -- 어느 Day에 포함되었는지
  (
    SELECT day_number 
    FROM completed_wordlists cw
    WHERE cw.student_id = '10000000-0000-0000-0000-000000000001'
      AND w.id = ANY(cw.word_ids)
    LIMIT 1
  ) as included_in_day
FROM words w
LEFT JOIN student_word_progress swp 
  ON w.id = swp.word_id 
  AND swp.student_id = '10000000-0000-0000-0000-000000000001'
WHERE w.wordlist_id = '20000000-0000-0000-0000-000000000001'
  AND w.sequence_order BETWEEN 1 AND 50
ORDER BY w.sequence_order;

-- ============================================
-- 📊 예상 결과 해석
-- ============================================
-- 
-- 케이스 A: Day 4 = [31~40] (10개)
--   → UI 표시 버그 (실제로는 정상)
--   → 해결: UI 수정 필요
--
-- 케이스 B: Day 4 = [31~39] (9개), 40번 없음
--   → 40번이 Skip되어 제외됨
--   → 해결: 최소 단어 수 검증 추가
--
-- 케이스 C: Day 4 = [31~39, 41] (10개)
--   → 40번 Skip, 41번 포함
--   → 해결: 정상 (검증 추가로 미래 방지)
--
-- ============================================

