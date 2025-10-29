-- ===================================================================
-- 100개 단어장 테스트 데이터 생성
-- ===================================================================

-- 1. 새로운 단어장 생성 (실제 100개)
INSERT INTO wordlists (id, name, total_words, created_by, created_at)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-100000000001',
  '테스트용 영단어 100',
  100,
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. 100개 단어 데이터 삽입
INSERT INTO words (wordlist_id, word_text, meaning, example, example_translation, mnemonic, sequence_order)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-100000000001',
  'word_' || n,
  '단어 ' || n || '의 뜻',
  'This is example sentence for word ' || n,
  '이것은 단어 ' || n || '의 예문입니다',
  '단어 ' || n || '을 외우는 방법',
  n
FROM generate_series(1, 100) AS n
ON CONFLICT DO NOTHING;

-- 3. 테스트 학생 생성 (UUID 형식으로 수정)
INSERT INTO users (id, name, role, email, password_hash, daily_goal, access_token, created_at)
VALUES (
  '11111111-2222-3333-4444-100000000001'::uuid,
  '테스트학생100',
  'student',
  'test100@test.com',
  'test_hash',
  30,
  '22222222-3333-4444-5555-100000000001'::uuid,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  access_token = EXCLUDED.access_token;

-- 4. 테스트 학생에게 단어장 배정
INSERT INTO student_wordlists (
  id,
  student_id,
  wordlist_id,
  assigned_by,
  generation,
  daily_goal,
  is_auto_generated,
  assigned_at
)
VALUES (
  '33333333-4444-5555-6666-100000000001'::uuid,
  '11111111-2222-3333-4444-100000000001'::uuid,
  'aaaaaaaa-bbbb-cccc-dddd-100000000001'::uuid,
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  1,
  30,
  false,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  student_id = EXCLUDED.student_id,
  wordlist_id = EXCLUDED.wordlist_id;

-- 5. 확인
SELECT '=== 생성 완료 ===' as status;

SELECT 
  '단어장' as type,
  name,
  total_words,
  (SELECT COUNT(*) FROM words WHERE wordlist_id = wordlists.id) as actual_words
FROM wordlists 
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-100000000001';

SELECT 
  '학생' as type,
  name,
  access_token,
  daily_goal
FROM users 
WHERE id = '11111111-2222-3333-4444-100000000001'::uuid;

SELECT 
  '배정' as type,
  sw.id as assignment_id,
  u.name as student_name,
  w.name as wordlist_name,
  sw.daily_goal
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.wordlist_id = w.id
WHERE sw.id = '33333333-4444-5555-6666-100000000001'::uuid;

