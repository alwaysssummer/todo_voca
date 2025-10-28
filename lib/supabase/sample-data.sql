-- Todo Voca 샘플 데이터

-- 1. 강사 계정 (이미 있을 수 있으므로 DELETE 후 INSERT)
DELETE FROM users WHERE email IN ('teacher@todovoca.com', 'teacher@todo.com', 'teacher');
INSERT INTO users (id, name, role, email, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', '김선생', 'teacher', 'teacher', '7136');

-- 2. 학생 계정 3명
DELETE FROM users WHERE role = 'student';
INSERT INTO users (id, name, role, access_token, daily_goal) VALUES
('10000000-0000-0000-0000-000000000001', '김철수', 'student', '10000001-0000-0000-0000-000000000001', 10),
('10000000-0000-0000-0000-000000000002', '이영희', 'student', '10000002-0000-0000-0000-000000000002', 10),
('10000000-0000-0000-0000-000000000003', '박지민', 'student', '10000003-0000-0000-0000-000000000003', 10);

-- 3. 단어장 생성
DELETE FROM wordlists;
INSERT INTO wordlists (id, name, total_words, created_by) VALUES
('20000000-0000-0000-0000-000000000001', '기초 영단어 100', 100, '00000000-0000-0000-0000-000000000001');

-- 4. 샘플 단어 30개 (기초 영단어)
DELETE FROM words;
INSERT INTO words (wordlist_id, word_text, meaning, example, example_translation, mnemonic, sequence_order) VALUES
-- 1-10
('20000000-0000-0000-0000-000000000001', 'apple', '사과', 'I eat an apple every day.', '나는 매일 사과를 먹는다.', NULL, 1),
('20000000-0000-0000-0000-000000000001', 'book', '책', 'This book is very interesting.', '이 책은 매우 흥미롭다.', NULL, 2),
('20000000-0000-0000-0000-000000000001', 'computer', '컴퓨터', 'I use a computer for work.', '나는 일하기 위해 컴퓨터를 사용한다.', NULL, 3),
('20000000-0000-0000-0000-000000000001', 'dog', '개', 'I have a dog.', '나는 개를 키운다.', NULL, 4),
('20000000-0000-0000-0000-000000000001', 'eat', '먹다', 'I eat breakfast at 7 AM.', '나는 아침 7시에 아침을 먹는다.', NULL, 5),
('20000000-0000-0000-0000-000000000001', 'friend', '친구', 'He is my best friend.', '그는 나의 가장 친한 친구다.', NULL, 6),
('20000000-0000-0000-0000-000000000001', 'good', '좋은', 'That is a good idea.', '그것은 좋은 생각이다.', NULL, 7),
('20000000-0000-0000-0000-000000000001', 'happy', '행복한', 'I am very happy today.', '나는 오늘 매우 행복하다.', NULL, 8),
('20000000-0000-0000-0000-000000000001', 'interesting', '흥미로운', 'This movie is very interesting.', '이 영화는 매우 흥미롭다.', NULL, 9),
('20000000-0000-0000-0000-000000000001', 'jump', '뛰다', 'The cat can jump very high.', '그 고양이는 매우 높이 뛸 수 있다.', NULL, 10),
-- 11-20
('20000000-0000-0000-0000-000000000001', 'knowledge', '지식', 'Knowledge is power.', '아는 것이 힘이다.', 'know(알다) + ledge(끝)', 11),
('20000000-0000-0000-0000-000000000001', 'love', '사랑', 'I love my family.', '나는 가족을 사랑한다.', 'love는 사랑하는 마음이 L자로 구부러진 모양', 12),
('20000000-0000-0000-0000-000000000001', 'morning', '아침', 'Good morning!', '좋은 아침!', 'mor(더) + ning → 더 밝아지는 시간', 13),
('20000000-0000-0000-0000-000000000001', 'night', '밤', 'Good night!', '잘 자!', 'n으로 시작하는 어두운 시간', 14),
('20000000-0000-0000-0000-000000000001', 'open', '열다', 'Please open the door.', '문을 열어주세요.', 'O처럼 입을 벌려서 여는 모습', 15),
('20000000-0000-0000-0000-000000000001', 'people', '사람들', 'Many people are here.', '많은 사람들이 여기 있다.', NULL, 16),
('20000000-0000-0000-0000-000000000001', 'question', '질문', 'Do you have any questions?', '질문 있나요?', NULL, 17),
('20000000-0000-0000-0000-000000000001', 'run', '달리다', 'I run every morning.', '나는 매일 아침 달린다.', NULL, 18),
('20000000-0000-0000-0000-000000000001', 'school', '학교', 'I go to school by bus.', '나는 버스로 학교에 간다.', NULL, 19),
('20000000-0000-0000-0000-000000000001', 'time', '시간', 'What time is it?', '몇 시인가요?', NULL, 20),
-- 21-30
('20000000-0000-0000-0000-000000000001', 'understand', '이해하다', 'Do you understand?', '이해했나요?', 'under(아래) + stand(서다) → 아래까지 알다', 21),
('20000000-0000-0000-0000-000000000001', 'very', '매우', 'It is very good.', '그것은 매우 좋다.', 'v자로 높이 올라간 정도', 22),
('20000000-0000-0000-0000-000000000001', 'walk', '걷다', 'I walk to school.', '나는 학교까지 걸어간다.', 'W자로 걷는 발 모양', 23),
('20000000-0000-0000-0000-000000000001', 'year', '년', 'Happy new year!', '새해 복 많이 받으세요!', NULL, 24),
('20000000-0000-0000-0000-000000000001', 'zoo', '동물원', 'Let''s go to the zoo.', '동물원에 가자.', NULL, 25),
('20000000-0000-0000-0000-000000000001', 'achieve', '성취하다', 'She achieved her goal.', '그녀는 목표를 달성했다.', 'a(~을 향해) + chieve(도달)', 26),
('20000000-0000-0000-0000-000000000001', 'beautiful', '아름다운', 'What a beautiful day!', '정말 아름다운 날이다!', NULL, 27),
('20000000-0000-0000-0000-000000000001', 'create', '만들다', 'Let''s create something new.', '새로운 것을 만들어보자.', NULL, 28),
('20000000-0000-0000-0000-000000000001', 'dream', '꿈', 'I have a dream.', '나는 꿈이 있다.', NULL, 29),
('20000000-0000-0000-0000-000000000001', 'example', '예시', 'For example...', '예를 들어...', NULL, 30);

-- 5. 학생에게 단어장 배정
DELETE FROM student_wordlists;
INSERT INTO student_wordlists (student_id, wordlist_id, assigned_by) VALUES
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- 6. 김철수의 진도 데이터 (5개 완료, 2개 Skip)
DELETE FROM student_word_progress;
INSERT INTO student_word_progress (student_id, word_id, status, skip_count, completed_date) VALUES
('10000000-0000-0000-0000-000000000001', 1, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 2, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 3, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 4, 'skipped', 2, NULL),
('10000000-0000-0000-0000-000000000001', 5, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 6, 'skipped', 1, NULL),
('10000000-0000-0000-0000-000000000001', 7, 'completed', 0, CURRENT_DATE);

-- 완료 메시지
SELECT 
    '✅ 샘플 데이터 생성 완료!' as message,
    '- 강사: teacher / 7136' as info1,
    '- 학생: 3명 (김철수, 이영희, 박지민)' as info2,
    '- 단어장: 1개 (기초 영단어 100)' as info3,
    '- 단어: 30개' as info4,
    '' as blank,
    '🔗 강사 로그인:' as link_teacher,
    'http://localhost:3000/teacher/login' as link1,
    '🔗 김철수 학습:' as link_student,
    'http://localhost:3000/s/10000001-0000-0000-0000-000000000001' as link2;

