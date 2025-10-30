# 시험지 출력 기능 - 8단계 개발 플랜

## 📋 개요

학생의 학습 기록에서 선택한 회차들의 단어로 시험지와 답지를 출력하는 기능

### 핵심 요구사항
- **아는 단어 시험지**: 선택 회차의 아는 단어 중 30% 랜덤 추출
- **모르는 단어 시험지**: 선택 회차의 모르는 단어 중 70% 랜덤 추출
- **시험지**: 번호 + 영어만
- **답지**: 번호 + 영어 + 한글 뜻
- **답지 시작**: 홀수 페이지(3페이지 또는 5페이지)부터 시작
- **레이아웃**: 기존 단어 모달과 동일 (2단, 좌측부터 채우기)

---

## 🎯 8단계 개발 계획

### ✅ 0단계: 현재 상태 커밋
**목표**: 안전한 복원 지점 확보

**작업**:
```bash
git add .
git commit -m "feat: Complete known/unknown words modal before exam print feature"
```

**완료 조건**:
- 현재 상태 커밋 완료
- 복원 지점 확보

---

### ⬜ 1단계: UI 추가 (Dashboard에 체크박스 + 버튼)
**목표**: 학습기록 섹션에 시험지 출력 UI만 추가

**작업**:
- [ ] 체크박스 state 관리 (`selectedSessions: string[]`)
- [ ] 각 회차 카드에 체크박스 추가
- [ ] 학습기록 상단에 버튼 2개 추가:
  - "아는 단어 시험지 출력" (Printer 아이콘)
  - "모르는 단어 시험지 출력" (Printer 아이콘)
- [ ] 버튼 활성화 조건: 1개 이상 회차 선택 시
- [ ] 버튼 클릭 시 `console.log`로 선택된 회차 확인

**파일**:
- `components/student/dashboard.tsx`

**테스트**:
- [ ] 체크박스 선택/해제 작동
- [ ] 버튼 클릭 시 콘솔에 선택된 회차 ID 배열 출력
- [ ] 선택 없으면 버튼 비활성화

**커밋**: `feat: Add exam print UI (checkboxes and buttons)`

---

### ⬜ 2단계: 기본 모달 컴포넌트 생성
**목표**: `ExamPrintModal.tsx` 기본 틀 생성

**작업**:
- [ ] `UnknownWordsModal.tsx` 복사 → `ExamPrintModal.tsx`
- [ ] Props 수정:
  ```typescript
  interface ExamPrintModalProps {
    open: boolean
    onClose: () => void
    sessionIds: string[]
    type: 'known' | 'unknown'
    title: string
  }
  ```
- [ ] 여러 회차의 단어 수집 로직 구현
- [ ] 중복 제거
- [ ] 화면에 단어 목록 표시 (인쇄 기능 제외)

**파일**:
- `components/student/exam-print-modal.tsx` (신규)

**테스트**:
- [ ] 모달 열림/닫힘 확인
- [ ] 선택한 회차들의 단어가 화면에 표시됨
- [ ] 중복 단어 제거 확인

**커밋**: `feat: Add ExamPrintModal component (display only)`

---

### ⬜ 3단계: 랜덤 추출 로직 구현
**목표**: 30% / 70% 랜덤 추출

**작업**:
- [ ] Shuffle 함수 구현 (Fisher-Yates)
- [ ] Known type: 전체의 30% 추출
- [ ] Unknown type: 전체의 70% 추출
- [ ] 추출 결과를 state에 저장

**파일**:
- `components/student/exam-print-modal.tsx`

**테스트**:
- [ ] 콘솔에서 추출된 단어 수 확인
- [ ] Known: Math.ceil(total * 0.3)
- [ ] Unknown: Math.ceil(total * 0.7)
- [ ] 랜덤성 확인 (여러 번 열었을 때 다른 단어)

**커밋**: `feat: Implement random word selection (30%/70%)`

---

### ⬜ 4단계: 시험지 섹션 구현
**목표**: 시험지 부분만 먼저 완성

**작업**:
- [ ] 시험지 섹션 레이아웃 (2단)
- [ ] `word_text`만 출력 (한글 뜻 제외)
- [ ] 번호 매기기 (1, 2, 3...)
- [ ] 좌측부터 채우기
- [ ] 화면 표시용 스타일
- [ ] 인쇄용 CSS

**파일**:
- `components/student/exam-print-modal.tsx`

**테스트**:
- [ ] 화면에서 시험지 형식 확인
- [ ] 인쇄 미리보기로 시험지만 확인
- [ ] 2단 레이아웃, 좌측부터 채우기 확인

**커밋**: `feat: Implement exam paper section (questions only)`

---

### ⬜ 5단계: 답지 섹션 구현
**목표**: 답지 부분 추가

**작업**:
- [ ] 답지 섹션 추가 (시험지 아래)
- [ ] `word_text : meaning` 출력
- [ ] 2단 레이아웃 동일하게
- [ ] 번호 매기기 (시험지와 동일)
- [ ] 구분선 표시

**파일**:
- `components/student/exam-print-modal.tsx`

**테스트**:
- [ ] 화면에서 답지 형식 확인
- [ ] 인쇄 미리보기에서 시험지 + 답지 모두 확인
- [ ] 번호가 일치하는지 확인

**커밋**: `feat: Add answer sheet section`

---

### ⬜ 6단계: 답지 홀수 페이지 시작 처리
**목표**: 답지가 3페이지 또는 5페이지부터 시작

**작업**:
- [ ] CSS `page-break-before` 설정
- [ ] 답지 섹션에 특별한 클래스 추가
- [ ] 양면 인쇄를 고려한 페이지 분할

**인쇄 로직**:
```
시험지 1~2페이지 → 답지 3페이지부터
시험지 3~4페이지 → 답지 5페이지부터
시험지 5~6페이지 → 답지 7페이지부터
```

**파일**:
- `components/student/exam-print-modal.tsx`

**테스트**:
- [ ] 시험지 1~2페이지 → 답지 3페이지 시작 확인
- [ ] 시험지 3~4페이지 → 답지 5페이지 시작 확인
- [ ] Chrome, Edge에서 인쇄 미리보기 확인

**커밋**: `feat: Implement odd-page start for answer sheet`

---

### ⬜ 7단계: Dashboard 통합 및 최종 테스트
**목표**: 모든 기능 연결 및 테스트

**작업**:
- [ ] Dashboard에 ExamPrintModal import 및 연결
- [ ] "아는 단어 시험지" 버튼 → modal open (type: 'known')
- [ ] "모르는 단어 시험지" 버튼 → modal open (type: 'unknown')
- [ ] 에러 처리 (선택 없음, 데이터 없음 등)
- [ ] 로딩 상태 표시

**파일**:
- `components/student/dashboard.tsx`
- `components/student/exam-print-modal.tsx`

**테스트 시나리오**:
- [ ] 1개 회차 선택 → 아는 단어 시험지 출력
- [ ] 1개 회차 선택 → 모르는 단어 시험지 출력
- [ ] 여러 회차 선택 (1~4회차) → 아는 단어 시험지
- [ ] 여러 회차 선택 (1~4회차) → 모르는 단어 시험지
- [ ] 모르는 단어가 없는 회차 → 에러 처리
- [ ] 아는 단어가 없는 회차 → 에러 처리

**커밋**: `feat: Complete exam print feature with full integration`

---

### ⬜ 8단계: 문서화 및 정리
**목표**: 사용 가이드 작성

**작업**:
- [ ] `EXAM-PRINT-GUIDE.md` 작성
- [ ] 사용 방법 정리
- [ ] 주의사항 및 제약사항
- [ ] 스크린샷 또는 예시

**커밋**: `docs: Add exam print feature guide`

---

## 📌 각 단계별 원칙

1. **한 단계씩만 진행**
2. **각 단계마다 테스트**
3. **문제 없으면 커밋**
4. **문제 발생 시 이전 커밋으로 복원**
5. **다음 단계로 진행**

---

## 🔧 기술 스택

- **React State**: 체크박스 선택 관리
- **Supabase**: 여러 회차 데이터 조회
- **CSS Print**: `@media print`, `page-break-before`
- **Algorithm**: Fisher-Yates Shuffle
- **Layout**: Flexbox 2단 레이아웃

---

## 📝 참고

- 기존 `UnknownWordsModal.tsx` / `KnownWordsModal.tsx` 레이아웃 재사용
- 인쇄 CSS 이슈 (2페이지 빈 페이지)는 시험지에서도 발생할 수 있음
- 홀수 페이지 시작이 핵심 기능

---

**생성일**: 2025-10-30
**상태**: 진행 중 (0단계 완료)

