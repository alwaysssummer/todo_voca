-- Step 4: 단어장 배정
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

SELECT '배정 완료' as status;
SELECT 
  u.name as student_name,
  w.name as wordlist_name,
  sw.daily_goal
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.wordlist_id = w.id
WHERE sw.id = '33333333-4444-5555-6666-100000000001'::uuid;

