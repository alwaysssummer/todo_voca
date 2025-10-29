-- ===================================================================
-- Phase 2: get_next_word 함수 - 회차 기반으로 수정
-- ===================================================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_next_word(UUID, UUID);

-- 새 함수 생성: 회차 기반
CREATE OR REPLACE FUNCTION get_next_word(
  p_student_id UUID, 
  p_assignment_id UUID,
  p_current_session INT DEFAULT 1  -- ⭐ 현재 회차 번호
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
      -- 학습 상태 필터링 (회차 기반)
      AND (
        -- 1. 아직 학습하지 않은 단어 (last_studied_session = 0 또는 NULL)
        swp.last_studied_session IS NULL 
        OR swp.last_studied_session = 0
        OR swp.status IS NULL
        OR swp.status = 'not_started'
        -- 2. 이전 회차에서 skip한 단어 (현재 회차보다 작은 회차)
        OR (
          swp.status = 'skipped' 
          AND swp.last_studied_session < p_current_session
        )
      )
    ORDER BY 
      -- Skip 단어 우선 (회차 시작 시 먼저 등장)
      CASE 
        WHEN swp.status = 'skipped' AND swp.last_studied_session < p_current_session THEN 0 
        ELSE 1 
      END,
      w.sequence_order ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 함수 설명
COMMENT ON FUNCTION get_next_word(UUID, UUID, INT) IS 
'학생의 다음 학습 단어를 가져옵니다. 회차 기반으로 Skip 단어는 다음 회차에 우선 등장합니다.';

SELECT '✅ get_next_word 함수 수정 완료! (회차 기반)' as status;

