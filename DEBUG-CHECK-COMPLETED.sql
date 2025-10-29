-- 정민99의 completed 단어 확인

SELECT 
  w.id,
  w.word_text,
  w.sequence_order,
  swp.status,
  swp.completed_date
FROM student_word_progress swp
JOIN words w ON swp.word_id = w.id
WHERE swp.student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  AND swp.status = 'completed'
ORDER BY w.sequence_order DESC
LIMIT 20;

-- 81-100번 단어의 상태
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
WHERE w.wordlist_id = (
  SELECT wordlist_id 
  FROM student_wordlists 
  WHERE student_id = (SELECT id FROM users WHERE name = '정민99' LIMIT 1)
  LIMIT 1
)
  AND w.sequence_order BETWEEN 81 AND 100
ORDER BY w.sequence_order;

