-- 정민99 Assignment 정보 확인

SELECT 
  sw.id as assignment_id,
  sw.generation,
  sw.filtered_word_ids,
  sw.daily_goal,
  sw.is_auto_generated,
  array_length(sw.filtered_word_ids, 1) as filtered_count,
  w.total_words as wordlist_total
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.wordlist_id = w.id
WHERE u.name = '정민99'
ORDER BY sw.generation DESC;

