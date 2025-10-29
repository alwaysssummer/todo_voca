-- 정민99 학습 진행 상태 확인

-- Completed 단어 수
SELECT COUNT(*) as completed_count
FROM student_word_progress swp
JOIN users u ON swp.student_id = u.id
WHERE u.name = '정민99'
  AND swp.status = 'completed';

