# Day 8-9: 온라인 평가 개발 완료

## 🎯 개발 내용

### 1. 온라인 평가 Hook
- `hooks/useOnlineTest.ts`: 평가 로직 관리
  - 문제 생성 (완성 단어의 20%, 최소 5문제)
  - 5분 타이머
  - 자동 채점 (정규화 비교)
  - 결과 저장

### 2. 평가 화면 컴포넌트
- `components/student/test-start-screen.tsx`: 평가 시작 화면
- `components/student/test-question-screen.tsx`: 문제 풀이 화면
- `components/student/test-result-screen.tsx`: 결과 화면

### 3. 라우팅
- `/s/[token]/test/[completedWordlistId]`: 평가 페이지

## 🚀 테스트 방법

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. 학습 페이지 접속
```
http://localhost:3000/s/student-uuid-token-1
```

### 3. 일일 목표 달성
- "알아요" 버튼을 10번 클릭하여 목표 달성
- 목표 달성 모달이 나타남

### 4. 온라인 평가 시작
- "온라인 평가 시작" 버튼 클릭
- 평가 시작 화면에서 정보 확인
- "평가 시작" 버튼 클릭

### 5. 문제 풀이
- 영어 단어를 보고 한글 뜻 입력
- 이전/다음 버튼으로 문제 이동
- 상단 타이머 확인 (5분)
- 마지막 문제에서 "제출하기" 버튼 클릭

### 6. 결과 확인
- 점수 및 등급 확인
- 정답/오답 개수 확인
- 오답 노트 확인
- "학습 화면으로" 버튼으로 복귀

## ✨ 주요 기능

### 문제 생성
- 완성한 단어의 20%를 무작위로 출제
- 최소 5문제 보장
- 무작위 순서로 섞임

### 타이머
- 5분 제한 시간
- 남은 시간 실시간 표시
- 1분 이하 시 경고 표시 (빨간색)
- 시간 종료 시 자동 제출

### 자동 채점
- 정규화된 텍스트 비교
  - 대소문자 무시
  - 공백 제거
  - 구두점 제거
- 정확히 일치해야 정답 처리

### 결과 화면
- 점수 (0-100점)
- 등급 (A, B, C, D, F)
- 정답/오답 개수
- 오답 노트 (내 답 vs 정답)
- 맞춘 단어 목록

## 📊 데이터베이스

### online_tests 테이블
```sql
INSERT INTO online_tests (
  student_id,
  completed_wordlist_id,
  total_questions,
  correct_count,
  score,
  wrong_word_ids,
  test_duration_seconds
)
```

### completed_wordlists 업데이트
```sql
UPDATE completed_wordlists
SET 
  online_test_completed = true,
  online_test_score = [점수]
WHERE id = [completed_wordlist_id]
```

## 🎨 UI 특징

### 평가 시작 화면
- 평가 정보 안내 (문제 수, 시간, 유형)
- 시각적 아이콘으로 직관적 표시
- "나중에" 버튼으로 학습 화면 복귀 가능

### 문제 풀이 화면
- 진행률 바
- 큰 글씨로 단어 표시
- 간단한 입력 인터페이스
- 답변 완료 개수 표시

### 결과 화면
- 점수별 색상 변화
  - 90점 이상: 초록색
  - 70-89점: 파란색
  - 50-69점: 주황색
  - 50점 미만: 빨간색
- 오답 노트로 복습 가능
- 맞춘 단어 뱃지 표시

## 🔍 다음 단계

Day 10-11에서는 오프라인 평가 (PDF 생성) 기능을 개발할 예정입니다.

