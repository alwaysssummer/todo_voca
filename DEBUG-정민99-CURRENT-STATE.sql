-- ===================================================================
-- 정민99 학생의 현재 상태 디버깅
-- ===================================================================

-- 1. 학생 기본 정보
SELECT '=== 1. 학생 정보 ===' as section;
SELECT id, name, daily_goal
FROM users
WHERE name = '정민99';

-- 2. Assignment 정보
SELECT '=== 2. Assignment 정보 ===' as section;
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

-- 3. 학습 진행 상태 (completed)
SELECT '=== 3. Completed Words ===' as section;
SELECT COUNT(*) as completed_count
FROM student_word_progress swp
JOIN users u ON swp.student_id = u.id
WHERE u.name = '정민99'
  AND swp.status = 'completed';

-- 4. 학습 진행 상태 (skipped)
SELECT '=== 4. Skipped Words ===' as section;
SELECT 
  swp.word_id,
  w.word_text,
  swp.skip_count,
  swp.next_appear_date
FROM student_word_progress swp
JOIN users u ON swp.student_id = u.id
JOIN words w ON swp.word_id = w.id
WHERE u.name = '정민99'
  AND swp.status = 'skipped'
ORDER BY w.sequence_order;

-- 5. 완성된 Day 목록
SELECT '=== 5. Completed Days ===' as section;
SELECT 
  cw.day_number,
  cw.generation,
  array_length(cw.word_ids, 1) as word_count,
  cw.completed_date
FROM completed_wordlists cw
JOIN users u ON cw.student_id = u.id
WHERE u.name = '정민99'
ORDER BY cw.generation, cw.day_number;

-- 6. 아직 학습하지 않은 단어들 (sequence 81-100)
SELECT '=== 6. Remaining Words (81-100) ===' as section;
SELECT 
  w.id,
  w.word_text,
  w.sequence_order,
  swp.status,
  swp.skip_count
FROM words w
LEFT JOIN student_word_progress swp 
  ON w.id = swp.word_id 
  AND swp.student_id = (SELECT id FROM users WHERE name = '정민99')
WHERE w.wordlist_id = (
  SELECT wordlist_id 
  FROM student_wordlists 
  WHERE student_id = (SELECT id FROM users WHERE name = '정민99')
  LIMIT 1
)
  AND w.sequence_order >= 81
ORDER BY w.sequence_order;

-- 7. get_next_word 함수 테스트
SELECT '=== 7. get_next_word Test ===' as section;
SELECT * FROM get_next_word(
  (SELECT id FROM users WHERE name = '정민99'),
  (SELECT id FROM student_wordlists WHERE student_id = (SELECT id FROM users WHERE name = '정민99') ORDER BY generation DESC LIMIT 1)
);

