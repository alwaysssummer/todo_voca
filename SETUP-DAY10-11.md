# Day 10-11: 강사 대시보드 개발 완료

## 🎯 개발 내용

### 1. 강사 로그인 페이지
- `app/teacher/login/page.tsx`: 이메일/비밀번호 로그인
  - Supabase 연동
  - 세션 관리 (sessionStorage)
  - 에러 처리

### 2. 강사 대시보드
- `app/teacher/dashboard/page.tsx`: 메인 대시보드
  - 요약 통계 (4가지 카드)
  - 단어장 목록
  - 학생 목록
  - 학생 접속 링크 복사

### 3. 샘플 데이터 업데이트
- `lib/supabase/sample-data.sql`: 강사 계정 추가
  - 이메일: teacher@todo.com
  - 비밀번호: password123

## 🚀 테스트 방법

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. 샘플 데이터 재실행 (옵션)
Supabase 대시보드에서 `lib/supabase/sample-data.sql` 파일의 내용을 실행하여 강사 계정을 추가합니다.

### 3. 강사 로그인
```
URL: http://localhost:3000/teacher/login
이메일: teacher@todo.com
비밀번호: password123
```

### 4. 대시보드 확인
로그인 성공 시 자동으로 `/teacher/dashboard`로 이동합니다.

#### 확인할 사항:
- ✅ 요약 통계 4개 카드 (전체 학생, 단어장 수, 평균 진도, 활동률)
- ✅ 단어장 목록 (카드 형태)
- ✅ 학생 목록 (진도바 표시)
- ✅ 학생 접속 링크 복사 기능

### 5. 학생 링크 복사 테스트
1. 대시보드에서 학생의 "링크 복사" 버튼 클릭
2. 복사된 링크를 새 탭에 붙여넣기
3. 학생 학습 화면이 나타나는지 확인

## ✨ 주요 기능

### 요약 통계
- **전체 학생**: 등록된 학생 수 + 오늘 활동한 학생 수
- **단어장 수**: 등록된 단어장 개수
- **평균 진도**: 전체 학생의 평균 진도율
- **활동률**: 오늘 학습한 학생 비율

### 단어장 목록
- 카드 형태로 표시
- 단어 개수, 배정된 학생 수 표시
- "보기" 버튼 (미구현)
- "단어장 추가" 버튼 (미구현)

### 학생 목록
- 학생 이름, 이메일
- 오늘 완료 단어 수 / 목표 단어 수 (배지)
- 진도바 (전체 진도율)
- **링크 복사**: 학생 접속 링크를 클립보드에 복사
- "상세보기" 버튼 (미구현)
- "학생 추가" 버튼 (미구현)

### 로그인/로그아웃
- sessionStorage를 사용한 간단한 세션 관리
- 로그아웃 시 세션 삭제 및 로그인 페이지로 이동
- 비로그인 상태에서 대시보드 접근 시 자동 리다이렉트

## 🎨 UI 특징

### 그라데이션 테마
- 보라색-파란색 그라데이션 (from-purple-600 to-blue-600)
- 일관된 브랜드 색상

### 카드 기반 레이아웃
- 요약 통계: 4개 그리드
- 단어장: 3열 그리드 (반응형)
- 학생: 세로 리스트

### 인터랙티브 요소
- 호버 효과 (카드 그림자)
- 진도바 애니메이션
- 배지 색상 (목표 달성 여부)

## 📊 데이터베이스 연동

### 조회 쿼리
```sql
-- 학생 목록 + 진도 정보
SELECT * FROM users WHERE role = 'student'
SELECT * FROM student_progress_summary WHERE student_id = ?

-- 단어장 목록
SELECT * FROM wordlists
SELECT COUNT(*) FROM words WHERE wordlist_id = ?
SELECT COUNT(*) FROM student_wordlists WHERE wordlist_id = ?
```

### student_progress_summary 뷰 활용
- `completed_today`: 오늘 완료한 단어 수
- `daily_goal`: 일일 목표 단어 수
- `progress_percentage`: 전체 진도율

## 🔍 다음 단계

Day 12-13에서는 학생 추가/관리 기능을 개발할 예정입니다:
- 학생 추가 다이얼로그
- 학생 상세보기 (완성 단어장 목록, 평가 결과)
- 단어장 배정 기능

