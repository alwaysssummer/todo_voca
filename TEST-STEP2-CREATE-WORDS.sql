-- Step 2: 100개 단어 생성
INSERT INTO words (wordlist_id, word_text, meaning, example, example_translation, mnemonic, sequence_order)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-100000000001'::uuid,
  'word_' || n,
  '단어 ' || n || '의 뜻',
  'This is example sentence for word ' || n,
  '이것은 단어 ' || n || '의 예문입니다',
  '단어 ' || n || '을 외우는 방법',
  n
FROM generate_series(1, 100) AS n
ON CONFLICT DO NOTHING;

SELECT '100개 단어 생성 완료' as status;
SELECT COUNT(*) as word_count FROM words WHERE wordlist_id = 'aaaaaaaa-bbbb-cccc-dddd-100000000001'::uuid;

