-- 정민99 나머지 단어 (81-100) 확인

SELECT 
  w.id,
  w.word_text,
  w.sequence_order,
  swp.status,
  swp.skip_count,
  swp.next_appear_date
FROM words w
LEFT JOIN student_word_progress swp 
  ON w.id = swp.word_id 
  AND swp.student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
WHERE w.wordlist_id = (
  SELECT wordlist_id 
  FROM student_wordlists 
  WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  LIMIT 1
)
  AND w.sequence_order >= 81
ORDER BY w.sequence_order;

