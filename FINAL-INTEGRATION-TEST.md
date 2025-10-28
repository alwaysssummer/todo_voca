# 🧪 최종 통합 테스트 가이드

## 📋 테스트 목표

수정된 핵심 로직과 새로 구현된 학생 대시보드가 완벽하게 통합되어 작동하는지 검증

---

## 🎯 테스트 준비

### 1. Supabase 데이터 초기화
```sql
-- QUICK-RESET.sql 실행
DELETE FROM student_word_progress WHERE student_id IN (
  SELECT id FROM users WHERE role = 'student'
);

DELETE FROM completed_wordlists WHERE student_id IN (
  SELECT id FROM users WHERE role = 'student'
);

DELETE FROM online_tests WHERE student_id IN (
  SELECT id FROM users WHERE role = 'student'
);

DELETE FROM student_wordlists WHERE generation > 1;

-- 확인
SELECT 
  u.name,
  COUNT(DISTINCT swp.id) as completed_count,
  COUNT(DISTINCT cw.id) as completed_days
FROM users u
LEFT JOIN student_word_progress swp ON u.id = swp.student_id AND swp.status = 'completed'
LEFT JOIN completed_wordlists cw ON u.id = cw.student_id
WHERE u.role = 'student'
GROUP BY u.id, u.name;
-- 결과: completed_count = 0, completed_days = 0
```

### 2. 서버 시작
```bash
npm run dev
```

### 3. 브라우저 준비
- 개발자 도구 열기 (F12)
- Console 탭 활성화

---

## ✅ 통합 테스트 시나리오

### 📌 시나리오 1: 초기 상태 확인

#### 1-1. 학습 페이지 로드
```
URL: http://localhost:3000/s/10000001-0000-0000-0000-000000000001
```

**확인 사항**:
- [ ] 헤더: "1차" 배지
- [ ] 헤더: "Day 1" 표시
- [ ] 헤더: "0/50" (오늘 진행률)
- [ ] 헤더: "0/100 (0%)" (전체 진행률)
- [ ] 단어가 표시됨
- [ ] "안다" / "모른다" 버튼 작동
- [ ] 완료 단어 목록 비어있음

#### 1-2. 대시보드 직접 접근
```
URL: http://localhost:3000/s/10000001-0000-0000-0000-000000000001/dashboard
```

**확인 사항**:
- [ ] 학생 이름: "김철수"
- [ ] 현재 단어장: "수능 필수 영단어 1800"
- [ ] 진행률: "0/100 (0%)"
- [ ] 현재 Day: "Day 1", "0/50 완료"
- [ ] 완성된 Day: "아직 완성된 Day가 없습니다."
- [ ] 통계: "0 완성한 Day", "0 완료한 단어", "0 완료한 평가"
- [ ] "학습 계속하기" 버튼 클릭 → 학습 페이지로 이동

---

### 📌 시나리오 2: Day 1 완성 (50개)

#### 2-1. 자동 클릭 스크립트
```javascript
// F12 Console
let c=0, t=50;
const auto=()=>{
  if(c>=t) return console.log('✅ 50개 완료!');
  const btn=document.querySelector('button:not([variant])');
  if(btn && btn.textContent.includes('안다')){
    btn.click(); c++;
    console.log(`진행: ${c}/50 | 전체: ${c}/100`);
    setTimeout(auto, 500);
  } else {
    console.error('❌ 버튼 없음');
  }
};
console.log('🚀 자동 클릭 시작...'); auto();
```

**확인 사항**:
- [ ] 1~49개: 헤더 "N/50" 업데이트
- [ ] 완료 단어 목록 실시간 업데이트 (영어 + 뜻)
- [ ] 50개 완료 시: **GoalAchievedModal 표시**
- [ ] 모달 내용: "목표 달성!", "Day 1", "50/50"
- [ ] 콘솔: "✅ Day 1 (1차) 완성 단어장 생성 완료"

#### 2-2. 대시보드 이동
```
GoalAchievedModal에서 "대시보드로" 클릭
```

**확인 사항**:
- [ ] URL: `/s/.../dashboard`
- [ ] 진행률: "50/100 (50%)"
- [ ] 현재 Day: "Day 2", "0/50 완료"
- [ ] 완성된 Day 목록:
  - ✅ [1차] Day 1
  - 50개 완료 · 2025-10-28
  - [평가 대기]
- [ ] 통계: "1 완성한 Day", "50 완료한 단어", "0 완료한 평가"

#### 2-3. 온라인 평가 시작
```
완성된 Day 1 카드에서 "평가 시작" 클릭
```

**확인 사항**:
- [ ] 평가 시작 화면 표시
- [ ] 문제 수: 10개 (50 * 0.2)
- [ ] 제한 시간: 5분
- [ ] "시작하기" 클릭 → 문제 화면
- [ ] 모든 문제 답변 → 결과 화면
- [ ] 점수 표시

#### 2-4. 대시보드 갱신 확인
```
평가 완료 후 대시보드로 돌아가기
```

**확인 사항**:
- [ ] 완성된 Day 1 카드:
  - 테스트 점수 배지 표시 (80점 이상 파란색, 이하 빨간색)
  - "결과 보기" 버튼으로 변경
- [ ] 통계: "1 완성한 평가"

---

### 📌 시나리오 3: Day 2 진행 (51개)

#### 3-1. 학습 계속하기
```
대시보드에서 "학습 계속하기" 클릭
```

**확인 사항**:
- [ ] 헤더: "Day 2", "0/50"
- [ ] 헤더: "50/100 (50%)"
- [ ] 51번째 단어 표시
- [ ] 완료 단어 목록 비어있음 (Day 2 시작)

#### 3-2. 51개 완료 (중요!)
```
"안다" 버튼 1회 클릭
```

**확인 사항**:
- [ ] 헤더: "Day 2", "1/50" ✅ (수정된 로직)
- [ ] 헤더: "51/100 (51%)"
- [ ] **모달이 뜨지 않음** ✅ (버그 수정 확인!)
- [ ] 다음 단어로 정상 이동

#### 3-3. 페이지 새로고침
```
F5 또는 브라우저 새로고침
```

**확인 사항**:
- [ ] 헤더: "Day 2", "1/50" ✅ (일관성 유지)
- [ ] 헤더: "51/100 (51%)"
- [ ] 다음 단어 정상 표시

---

### 📌 시나리오 4: Day 2 완성 (100개)

#### 4-1. 자동 클릭 (51→100)
```javascript
// F12 Console
let c=51, t=100;
const auto=()=>{
  if(c>=t) return console.log('✅ 100개 완료!');
  const btn=document.querySelector('button:not([variant])');
  if(btn && btn.textContent.includes('안다')){
    btn.click(); c++;
    console.log(`Day 2: ${c-50}/50 | 전체: ${c}/100`);
    setTimeout(auto, 500);
  } else {
    console.error('❌ 버튼 없음');
  }
};
console.log('🚀 자동 클릭 시작...'); auto();
```

**확인 사항**:
- [ ] 99개: 헤더 "Day 2", "49/50"
- [ ] 100개: **GoalAchievedModal 표시**
- [ ] 모달 내용: "목표 달성!", "Day 2", "50/50"
- [ ] 콘솔: "✅ Day 2 (1차) 완성 단어장 생성 완료"

#### 4-2. 세대 완료 확인
```
GoalAchievedModal 닫기 후 잠시 대기
```

**확인 사항**:
- [ ] **GenerationCompleteModal 표시** (자동)
- [ ] 모달 내용: "1차 단어장 완성!"
- [ ] 스킵 단어 개수 표시
- [ ] "2차 단어장 생성 완료" 메시지

#### 4-3. Supabase 확인
```sql
SELECT * FROM student_wordlists 
WHERE student_id = '10000001-0000-0000-0000-000000000001'
ORDER BY generation;

-- 결과:
-- generation | filtered_word_ids | 비고
-- 1          | NULL              | 원본 100개
-- 2          | [5, 12, 23, ...]  | 스킵한 단어만
```

**확인 사항**:
- [ ] 2차 단어장 자동 생성됨
- [ ] `filtered_word_ids` 개수 = 스킵한 단어 개수

---

### 📌 시나리오 5: 2차 단어장 학습

#### 5-1. 2차 단어장 시작
```
GenerationCompleteModal에서 "학습 시작" 클릭
```

**확인 사항**:
- [ ] 페이지 새로고침
- [ ] 헤더: "2차" 배지
- [ ] 헤더: "Day 1" (2차의 Day 1)
- [ ] 헤더: "0/N" (N = 2차 단어장 단어 수)
- [ ] 헤더: "0/N (0%)" (전체 진행률)

#### 5-2. 대시보드 확인
```
URL: /s/.../dashboard
```

**확인 사항**:
- [ ] 현재 세대: "2차" 배지
- [ ] 진행률: "0/N (0%)"
- [ ] 현재 Day: "Day 1", "0/N 완료"
- [ ] 완성된 Day 목록:
  - ✅ [1차] Day 1
  - ✅ [1차] Day 2
- [ ] 통계: "2 완성한 Day", "100 완료한 단어"

---

## 🎯 성공 기준

### ✅ 모든 확인 사항 통과
- [ ] 초기 상태 정상
- [ ] Day 1 완성 및 대시보드 이동
- [ ] 51개 완료 시 모달 안 뜸 (버그 수정)
- [ ] Day 2 완성 및 세대 완료
- [ ] 2차 단어장 자동 생성
- [ ] 대시보드 모든 기능 정상 작동

### ✅ 콘솔 에러 없음
- [ ] 빨간색 에러 메시지 없음
- [ ] Supabase 406 에러 없음
- [ ] React 경고 없음

### ✅ 데이터 무결성
- [ ] `completed_wordlists`: Day 번호 정확
- [ ] `student_word_progress`: 완료 상태 정확
- [ ] `student_wordlists`: 2차 단어장 생성 확인

---

## 🐛 예상 이슈 & 해결

### 이슈 1: "모든 단어 완료!" 표시 (51개 이후)
**원인**: `get_next_word` 함수가 단어를 찾지 못함

**해결**:
```sql
-- ADD-MORE-WORDS.sql 실행
-- 또는 COMPLETE-TEST-SETUP.sql 실행
```

### 이슈 2: 대시보드 로딩 무한
**원인**: Supabase 연결 문제 또는 데이터 누락

**확인**:
```sql
SELECT * FROM users WHERE access_token = '10000001-0000-0000-0000-000000000001';
SELECT * FROM student_wordlists WHERE student_id = (SELECT id FROM users WHERE access_token = '...');
```

### 이슈 3: Day 번호가 이상함
**원인**: 수정 전 로직 잔재

**확인**:
```bash
# 서버 재시작
npm run dev
```

---

## 📊 테스트 체크리스트

### 핵심 로직 수정 검증
- [ ] `progress.today`: Day 내 진행률 (0~49)
- [ ] Day 번호: 수학적 계산 (`floor(completed / goal) + 1`)
- [ ] 목표 달성: 배수 체크 (`completed % goal === 0`)
- [ ] 51개 완료 시 모달 안 뜸 (버그 수정!)

### 대시보드 기능 검증
- [ ] 초기 로드 정상
- [ ] 학습 계속하기 버튼
- [ ] 완성된 Day 목록 표시
- [ ] 온라인 평가 연동
- [ ] 통계 정확
- [ ] GoalAchievedModal "대시보드로" 버튼

### 세대별 학습 검증
- [ ] 1차 완료 시 2차 자동 생성
- [ ] 2차 학습 시 `filtered_word_ids` 적용
- [ ] 대시보드에서 세대 구분 표시

---

## 🎉 테스트 통과 시

**축하합니다!** 🎊

다음 단계로 진행 가능:
1. ✅ 핵심 로직 수정
2. ✅ 학생 대시보드 구현
3. ✅ 전체 통합 테스트
4. ⬜ Phase 2 고도화 기능 개발

---

**작성일**: 2025-10-28  
**예상 소요 시간**: 30-45분  
**난이도**: ⭐⭐⭐⭐☆

