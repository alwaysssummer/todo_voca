-- ===================================================================
-- Skip 단어 현황 확인
-- ===================================================================

-- 1. 현재 Skip한 단어 전체 목록
SELECT 
    '1. 현재 Skip한 단어 목록' as section,
    w.id,
    w.word_text,
    w.sequence_order,
    swp.skip_count,
    swp.last_studied_session,
    swp.completed_date,
    CASE 
        WHEN swp.last_studied_session < 5 THEN '5회차 등장 예정'
        WHEN swp.last_studied_session = 5 THEN '현재 회차 skip'
        ELSE '미래 회차'
    END as status_for_session_5
FROM student_word_progress swp
JOIN words w ON w.id = swp.word_id
WHERE swp.student_id = '08a59d7c-012a-40fe-a92a-032071898032'
  AND swp.status = 'skipped'
ORDER BY w.sequence_order ASC;

-- 2. completed_wordlists의 unknown_word_ids (X-TEST용)
SELECT 
    '2. 각 회차별 X-TEST 단어' as section,
    cw.session_number,
    cw.completed_date,
    array_length(cw.word_ids, 1) as known_count,
    array_length(cw.unknown_word_ids, 1) as unknown_count,
    cw.unknown_word_ids
FROM completed_wordlists cw
WHERE cw.student_id = '08a59d7c-012a-40fe-a92a-032071898032'
  AND cw.assignment_id = 'e508c896-da55-4add-a839-dfb860c84e4f'
ORDER BY cw.session_number ASC;

-- 3. 5회차에서 등장할 skip 단어 순서
SELECT 
    '3. 5회차 등장 순서' as section,
    w.sequence_order,
    w.word_text,
    swp.last_studied_session as skipped_in_session,
    swp.skip_count
FROM words w
JOIN student_word_progress swp 
  ON w.id = swp.word_id 
  AND swp.student_id = '08a59d7c-012a-40fe-a92a-032071898032'
WHERE w.wordlist_id = (
    SELECT wordlist_id 
    FROM student_wordlists 
    WHERE id = 'e508c896-da55-4add-a839-dfb860c84e4f'
)
  AND swp.status = 'skipped'
  AND swp.last_studied_session < 5
ORDER BY 
  CASE WHEN swp.status = 'skipped' THEN 0 ELSE 1 END,
  w.sequence_order ASC;

-- 4. 통계
SELECT 
    '4. 통계' as section,
    COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
    COUNT(*) FILTER (WHERE status = 'skipped') as total_skipped,
    COUNT(*) FILTER (WHERE status = 'skipped' AND last_studied_session = 1) as skipped_session_1,
    COUNT(*) FILTER (WHERE status = 'skipped' AND last_studied_session = 2) as skipped_session_2,
    COUNT(*) FILTER (WHERE status = 'skipped' AND last_studied_session = 3) as skipped_session_3,
    COUNT(*) FILTER (WHERE status = 'skipped' AND last_studied_session = 4) as skipped_session_4
FROM student_word_progress
WHERE student_id = '08a59d7c-012a-40fe-a92a-032071898032';

