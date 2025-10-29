-- ===================================================================
-- 중복된 복습 단어장 정리 스크립트
-- ===================================================================

SELECT '=== 1. 중복된 복습 단어장 확인 ===' as step;

-- 중복된 복습 단어장 조회
SELECT 
  name,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY created_at DESC) as wordlist_ids,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM wordlists
WHERE name LIKE '%복습%'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

SELECT '=== 2. 중복 단어장 삭제 (최신 것만 유지) ===' as step;

-- ⚠️ 주의: 이 쿼리는 중복된 복습 단어장 중 가장 오래된 것들을 삭제합니다
-- 최신 것 1개만 유지하고 나머지는 모두 삭제

-- 2-1. 삭제할 단어장 ID 확인
WITH duplicate_wordlists AS (
  SELECT 
    name,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
  FROM wordlists
  WHERE name LIKE '%복습%'
)
SELECT 
  '삭제 예정' as status,
  name,
  id,
  created_at
FROM duplicate_wordlists
WHERE rn > 1
ORDER BY name, created_at;

SELECT '=== 3. 실제 삭제 실행 ===' as step;

-- 3-1. 먼저 해당 단어장의 words 삭제 (외래 키 제약 조건 때문)
WITH wordlists_to_delete AS (
  SELECT id
  FROM (
    SELECT 
      id,
      name,
      ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
    FROM wordlists
    WHERE name LIKE '%복습%'
  ) sub
  WHERE rn > 1
)
DELETE FROM words
WHERE wordlist_id IN (SELECT id FROM wordlists_to_delete);

-- 3-2. 단어장 삭제
WITH wordlists_to_delete AS (
  SELECT id
  FROM (
    SELECT 
      id,
      name,
      ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
    FROM wordlists
    WHERE name LIKE '%복습%'
  ) sub
  WHERE rn > 1
)
DELETE FROM wordlists
WHERE id IN (SELECT id FROM wordlists_to_delete);

SELECT '=== 4. 정리 결과 확인 ===' as step;

-- 남아있는 복습 단어장 확인
SELECT 
  name,
  id,
  total_words,
  created_at,
  created_by
FROM wordlists
WHERE name LIKE '%복습%'
ORDER BY created_at DESC;

-- 중복 체크 (이제 모두 1개씩만 있어야 함)
SELECT 
  name,
  COUNT(*) as count
FROM wordlists
WHERE name LIKE '%복습%'
GROUP BY name
HAVING COUNT(*) > 1;

SELECT '✅ 중복 복습 단어장 정리 완료!' as status;

