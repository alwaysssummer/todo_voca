-- ===================================================================
-- get_next_word 함수 현재 버전 확인
-- ===================================================================

-- 함수 정의 확인
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_next_word'
  AND n.nspname = 'public';

