-- ===================================================================
-- 81-100번 단어 디버깅 SQL
-- ===================================================================

-- 1. 기초 영단어 100의 모든 단어 확인
SELECT 
  id,
  word_text,
  sequence_order,
  wordlist_id
FROM words
WHERE wordlist_id = (SELECT id FROM wordlists WHERE name = '기초 영단어 100')
  AND sequence_order BETWEEN 81 AND 100
ORDER BY sequence_order ASC;

-- 2. 정민99의 student_word_progress 확인 (81-100번)
SELECT 
  w.id,
  w.word_text,
  w.sequence_order,
  swp.status,
  swp.completed_date
FROM words w
LEFT JOIN student_word_progress swp 
  ON w.id = swp.word_id 
  AND swp.student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
WHERE w.wordlist_id = (SELECT id FROM wordlists WHERE name = '기초 영단어 100')
  AND w.sequence_order BETWEEN 81 AND 100
ORDER BY w.sequence_order ASC;

-- 3. get_next_word 함수 직접 테스트
SELECT * FROM get_next_word(
  (SELECT id FROM users WHERE name = '정민99' LIMIT 1),
  (SELECT id FROM student_wordlists 
   WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
     AND generation = 1
     AND is_auto_generated = false
   LIMIT 1)
);

-- 4. assignment의 filtered_word_ids 확인
SELECT 
  id,
  generation,
  filtered_word_ids,
  array_length(filtered_word_ids, 1) as word_count
FROM student_wordlists
WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  AND generation = 1
  AND is_auto_generated = false;

SELECT '✅ 디버깅 SQL 준비 완료!' as status;

