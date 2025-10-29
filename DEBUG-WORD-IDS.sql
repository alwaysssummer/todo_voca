-- 실제 단어 ID 확인

SELECT id, word_text, sequence_order
FROM words
WHERE wordlist_id = (
  SELECT wordlist_id 
  FROM student_wordlists 
  WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  LIMIT 1
)
ORDER BY sequence_order
LIMIT 10;

-- 전체 단어 ID 범위
SELECT 
  MIN(id) as min_id,
  MAX(id) as max_id,
  COUNT(*) as total_count
FROM words
WHERE wordlist_id = (
  SELECT wordlist_id 
  FROM student_wordlists 
  WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  LIMIT 1
);

