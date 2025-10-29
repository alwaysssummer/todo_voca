-- ===================================================================
-- 정민99 학생 진행 상태 초기화 (100번째 단어 테스트용)
-- ===================================================================

-- 1. 81-100번 단어의 진행 상태 삭제 (다시 학습 가능하게)
DELETE FROM student_word_progress
WHERE student_id = (SELECT id FROM users WHERE name = '정민99')
  AND word_id IN (
    SELECT id FROM words 
    WHERE wordlist_id = (
      SELECT wordlist_id 
      FROM student_wordlists 
      WHERE student_id = (SELECT id FROM users WHERE name = '정민99')
      LIMIT 1
    )
    AND sequence_order BETWEEN 81 AND 100
  );

-- 2. Day 8 완성 단어장 삭제 (81-86번 단어 포함)
DELETE FROM completed_wordlists
WHERE student_id = (SELECT id FROM users WHERE name = '정민99')
  AND day_number = 8;

SELECT '✅ 정민99 학생의 81-100번 단어 상태가 초기화되었습니다!' as status;
SELECT '✅ 이제 학습을 재개하여 100번째 단어 테스트를 진행할 수 있습니다!' as status;

-- 확인: 현재 completed 단어 수
SELECT COUNT(*) as completed_count
FROM student_word_progress
WHERE student_id = (SELECT id FROM users WHERE name = '정민99')
  AND status = 'completed';

