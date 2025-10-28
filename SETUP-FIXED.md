# 🔧 로그인 문제 수정 완료

## ✅ 수정된 내용

### 1. **sample-data.sql 파일 수정**
- ❌ 이전: `access_token` 값이 문자열 (`'student-uuid-token-1'`)
- ✅ 수정: UUID 형식으로 변경 (`'10000001-0000-0000-0000-000000000001'`)

### 2. **강사 로그인 정보**
- **아이디**: `teacher`
- **비밀번호**: `7136`

---

## 🚀 Supabase 데이터베이스 업데이트 방법

### 방법 1: 빠른 수정 (강사 로그인만)

1. **Supabase 대시보드** 접속
2. **SQL Editor** 클릭
3. **New query** 클릭
4. 다음 SQL 실행:

```sql
-- 기존 강사 계정 삭제
DELETE FROM users WHERE role = 'teacher';

-- 새 강사 계정 생성 (teacher / 7136)
INSERT INTO users (id, name, role, email, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', '김선생', 'teacher', 'teacher', '7136');

-- 확인
SELECT id, name, role, email, password_hash FROM users WHERE role = 'teacher';
```

5. **Run** 버튼 클릭
6. 결과 확인: `email: 'teacher', password_hash: '7136'`

---

### 방법 2: 전체 데이터 재생성 (권장)

1. **Supabase 대시보드** 접속
2. **SQL Editor** 클릭
3. **New query** 클릭
4. `lib/supabase/sample-data.sql` 파일 전체 내용 복사
5. **Run** 버튼 클릭
6. 완료 메시지 확인

---

## 🔗 접속 링크

### 강사 로그인
- URL: http://localhost:3000/teacher/login
- 아이디: `teacher`
- 비밀번호: `7136`

### 학생 학습 페이지 (김철수)
- URL: http://localhost:3000/s/10000001-0000-0000-0000-000000000001

---

## ⚠️ 주의사항

1. SQL 실행 시 **마크다운 주석 없이** 순수 SQL만 복사하세요
2. UUID 형식이 아닌 문자열을 `access_token`에 넣으면 오류 발생
3. 로그인 페이지의 placeholder는 `teacher` / `7136`으로 이미 수정됨

---

## 🎉 완료 후 확인

1. ✅ Supabase SQL 실행 완료
2. ✅ 브라우저에서 http://localhost:3000/teacher/login 접속
3. ✅ `teacher` / `7136` 로그인 테스트
4. ✅ 대시보드 정상 동작 확인

