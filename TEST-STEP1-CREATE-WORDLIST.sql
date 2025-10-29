-- Step 1: 단어장 생성
INSERT INTO wordlists (id, name, total_words, created_by, created_at)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-100000000001'::uuid,
  '테스트용 영단어 100',
  100,
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

SELECT '단어장 생성 완료' as status;

