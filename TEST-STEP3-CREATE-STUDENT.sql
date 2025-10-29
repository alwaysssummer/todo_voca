-- Step 3: 테스트 학생 생성
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

SELECT '학생 생성 완료' as status;
SELECT name, access_token FROM users WHERE id = '11111111-2222-3333-4444-100000000001'::uuid;

