# Supabase 데이터베이스 설정 가이드

## ✅ 완료된 작업
- [x] Supabase 프로젝트 생성
- [x] API Keys 설정 (.env.local)
- [x] Next.js 서버 연동

## 📋 다음 단계: 데이터베이스 설정

### 1단계: 테이블 생성

Supabase 대시보드 → **SQL Editor** → **New query**

`lib/supabase/database.sql` 파일 전체 내용 복사 후 실행

### 2단계: 샘플 데이터 입력

Supabase SQL Editor에서 다음 SQL 실행:

```sql
-- Todo Voca 샘플 데이터

-- 1. 강사 계정
DELETE FROM users WHERE email IN ('teacher@todovoca.com', 'teacher@todo.com', 'teacher');
INSERT INTO users (id, name, role, email, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', '김선생', 'teacher', 'teacher', '7136');

-- 2. 학생 계정 3명
DELETE FROM users WHERE role = 'student';
INSERT INTO users (id, name, role, access_token, daily_goal) VALUES
('10000000-0000-0000-0000-000000000001', '김철수', 'student', 'student-uuid-token-1', 10),
('10000000-0000-0000-0000-000000000002', '이영희', 'student', 'student-uuid-token-2', 10),
('10000000-0000-0000-0000-000000000003', '박지민', 'student', 'student-uuid-token-3', 10);

-- 3. 단어장 생성
DELETE FROM wordlists;
INSERT INTO wordlists (id, name, total_words, created_by) VALUES
('20000000-0000-0000-0000-000000000001', '기초 영단어 100', 100, '00000000-0000-0000-0000-000000000001');

-- 4. 샘플 단어 15개
DELETE FROM words;
INSERT INTO words (wordlist_id, word_text, meaning, example, example_translation, mnemonic, sequence_order) VALUES
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
('20000000-0000-0000-0000-000000000001', 'knowledge', '지식', 'Knowledge is power.', '아는 것이 힘이다.', 'know(알다) + ledge(끝)', 11),
('20000000-0000-0000-0000-000000000001', 'love', '사랑', 'I love my family.', '나는 가족을 사랑한다.', NULL, 12),
('20000000-0000-0000-0000-000000000001', 'morning', '아침', 'Good morning!', '좋은 아침!', NULL, 13),
('20000000-0000-0000-0000-000000000001', 'night', '밤', 'Good night!', '잘 자!', NULL, 14),
('20000000-0000-0000-0000-000000000001', 'open', '열다', 'Please open the door.', '문을 열어주세요.', NULL, 15);

-- 5. 학생에게 단어장 배정
DELETE FROM student_wordlists;
INSERT INTO student_wordlists (student_id, wordlist_id, assigned_by) VALUES
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- 6. 김철수의 진도 데이터
DELETE FROM student_word_progress;
INSERT INTO student_word_progress (student_id, word_id, status, skip_count, completed_date) VALUES
('10000000-0000-0000-0000-000000000001', 1, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 2, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 3, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 4, 'skipped', 2, NULL),
('10000000-0000-0000-0000-000000000001', 5, 'completed', 0, CURRENT_DATE),
('10000000-0000-0000-0000-000000000001', 6, 'skipped', 1, NULL),
('10000000-0000-0000-0000-000000000001', 7, 'completed', 0, CURRENT_DATE);
```

### 3단계: 확인

#### 강사 로그인 테스트
- URL: http://localhost:3000/teacher/login
- 아이디: `teacher`
- 비밀번호: `7136`

#### 학생 학습 페이지 테스트
- URL: http://localhost:3000/s/student-uuid-token-1
- 김철수 학습 페이지

## ✅ 성공 확인
- [ ] 강사 로그인 성공
- [ ] 대시보드에 학생 3명 표시
- [ ] 학생 학습 페이지 접속
- [ ] 단어 학습 가능

## ❓ 문제 해결

### 로그인 실패 시
1. Supabase SQL Editor에서 다음 확인:
```sql
SELECT * FROM users WHERE role = 'teacher';
```
2. email이 'teacher', password_hash가 '7136'인지 확인

### 환경변수 확인
`.env.local` 파일에 올바른 값이 있는지 확인:
```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[YOUR-KEY]...
```

