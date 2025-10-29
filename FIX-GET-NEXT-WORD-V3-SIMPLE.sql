-- ===================================================================
-- get_next_word 함수 수정 V3: 오늘 skip한 단어는 내일 등장
-- ===================================================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_next_word(UUID, UUID);

-- 새 함수 생성: 오늘 skip한 단어는 제외, 과거 skip한 단어만 등장
CREATE OR REPLACE FUNCTION get_next_word(
  p_student_id UUID, 
  p_assignment_id UUID
)
RETURNS TABLE (
    id INT,
    wordlist_id UUID,
    word_text VARCHAR,
    meaning TEXT,
    example TEXT,
    example_translation TEXT,
    mnemonic TEXT,
    audio_url TEXT,
    sequence_order INT
) AS $$
DECLARE
    v_wordlist_id UUID;
    v_filtered_word_ids INT[];
BEGIN
    -- assignment에서 wordlist_id와 filtered_word_ids 가져오기
    SELECT 
        sw.wordlist_id,
        sw.filtered_word_ids
    INTO 
        v_wordlist_id,
        v_filtered_word_ids
    FROM student_wordlists sw
    WHERE sw.id = p_assignment_id
      AND sw.student_id = p_student_id;
    
    -- assignment가 없으면 NULL 반환
    IF v_wordlist_id IS NULL THEN
        RETURN;
    END IF;
    
    -- 다음 학습할 단어 찾기
    RETURN QUERY
    SELECT 
        w.id, 
        w.wordlist_id, 
        w.word_text, 
        w.meaning, 
        w.example, 
        w.example_translation, 
        w.mnemonic, 
        w.audio_url, 
        w.sequence_order
    FROM words w
    LEFT JOIN student_word_progress swp 
      ON w.id = swp.word_id 
      AND swp.student_id = p_student_id
    WHERE w.wordlist_id = v_wordlist_id
      -- 세대별 필터링: filtered_word_ids가 있으면 해당 단어만
      AND (v_filtered_word_ids IS NULL OR w.id = ANY(v_filtered_word_ids))
      -- 학습 상태 필터링
      AND (
        -- 1. 아직 학습하지 않은 단어
        swp.status IS NULL 
        OR swp.status = 'not_started'
        -- 2. Skip한 단어는 오늘이 아닌 경우만 (과거 skip 단어)
        OR (
          swp.status = 'skipped' 
          AND swp.completed_date < CURRENT_DATE  -- ⭐ 오늘 skip은 제외!
        )
      )
    ORDER BY 
      -- Skip 단어 우선 (회차 시작 시)
      CASE WHEN swp.status = 'skipped' THEN 0 ELSE 1 END,
      w.sequence_order ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 함수 설명
COMMENT ON FUNCTION get_next_word(UUID, UUID) IS 
'학생의 다음 학습 단어를 가져옵니다. 오늘 skip한 단어는 제외되고, 과거 skip한 단어는 우선 등장합니다.';

SELECT '✅ get_next_word 함수 V3 수정 완료! (오늘 skip 단어 제외)' as status;

