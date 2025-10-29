-- ===================================================================
-- assignment의 filtered_word_ids를 NULL로 업데이트 (1차 세대만)
-- ===================================================================

-- 정민99의 1차 세대 assignment 확인
SELECT 
  id,
  student_id,
  generation,
  filtered_word_ids,
  array_length(filtered_word_ids, 1) as word_count,
  is_auto_generated
FROM student_wordlists
WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  AND generation = 1
  AND is_auto_generated = false;

-- 1차 세대의 filtered_word_ids를 NULL로 업데이트 (전체 100개 단어 사용)
UPDATE student_wordlists
SET filtered_word_ids = NULL
WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  AND generation = 1
  AND is_auto_generated = false;

-- 업데이트 확인
SELECT 
  id,
  student_id,
  generation,
  filtered_word_ids,
  is_auto_generated,
  '✅ filtered_word_ids가 NULL로 업데이트되어 전체 100개 단어를 사용합니다' as status
FROM student_wordlists
WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  AND generation = 1
  AND is_auto_generated = false;

