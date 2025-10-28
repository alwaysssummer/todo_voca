# 🧪 로직 수정 테스트 가이드

## 📋 사전 준비

### 1. Supabase 데이터 리셋
```sql
-- QUICK-RESET.sql 실행 (Supabase SQL Editor)
DELETE FROM student_word_progress WHERE student_id IN (
  SELECT id FROM users WHERE role = 'student'
);

DELETE FROM completed_wordlists WHERE student_id IN (
  SELECT id FROM users WHERE role = 'student'
);

DELETE FROM student_wordlists WHERE generation > 1;

-- 확인
SELECT 
  u.name,
  COUNT(swp.id) as completed_count,
  COUNT(cw.id) as completed_days
FROM users u
LEFT JOIN student_word_progress swp ON u.id = swp.student_id AND swp.status = 'completed'
LEFT JOIN completed_wordlists cw ON u.id = cw.student_id
WHERE u.role = 'student'
GROUP BY u.id, u.name;
```

### 2. 브라우저 접속
```
http://localhost:3000/s/10000001-0000-0000-0000-000000000001
```

---

## ✅ 테스트 시나리오

### 테스트 1: 초기 로드
**목표**: Day 번호와 진행률이 올바르게 표시되는지 확인

**확인 사항**:
- [ ] 헤더: "1차" 배지
- [ ] 헤더: "Day 1" 표시
- [ ] 헤더: "0/50" 표시 (오늘 진행률)
- [ ] 헤더: "0/100 (0%)" 표시 (전체 진행률)

---

### 테스트 2: 50개 완료 (Day 1 완성)
**목표**: 정확히 50개에서 GoalAchievedModal이 표시되는지 확인

**자동 클릭 스크립트** (F12 Console):
```javascript
let c=0, t=50;
const auto=()=>{
  if(c>=t) return console.log('✅ 50개 완료!');
  const btn=document.querySelector('button:not([variant])');
  if(btn && btn.textContent.includes('안다')){
    btn.click(); c++;
    console.log(`진행: ${c}/50 (전체: ${c}/100)`);
    setTimeout(auto, 500);
  } else {
    console.error('버튼 없음');
  }
};
console.log('🚀 자동 클릭 시작...'); auto();
```

**확인 사항**:
- [ ] 49개 완료: 헤더 "49/50"
- [ ] 50개 완료: **GoalAchievedModal 표시**
- [ ] 모달 내용: "Day 1 완성!", "50개 완료"
- [ ] 콘솔: "✅ Day 1 (1차) 완성 단어장 생성 완료"

---

### 테스트 3: 51개 완료 (버그 수정 확인)
**목표**: 51개에서 모달이 **뜨지 않는지** 확인 (이전 버그 수정)

**작업**:
1. GoalAchievedModal에서 "나중에 하기" 클릭
2. "안다" 버튼 클릭 (51번째 단어)

**확인 사항**:
- [ ] 51개 완료: **모달이 뜨지 않음** ✅
- [ ] 다음 단어로 정상 이동 ✅
- [ ] 페이지 새로고침
- [ ] 헤더: "Day 2" 표시 ✅
- [ ] 헤더: "1/50" 표시 (Day 2의 1개 완료) ✅
- [ ] 헤더: "51/100 (51%)" 표시

---

### 테스트 4: 100개 완료 (세대 완료)
**목표**: GenerationCompleteModal이 표시되고 2차 단어장이 생성되는지 확인

**자동 클릭 스크립트** (F12 Console):
```javascript
let c=51, t=100;
const auto=()=>{
  if(c>=t) return console.log('✅ 100개 완료!');
  const btn=document.querySelector('button:not([variant])');
  if(btn && btn.textContent.includes('안다')){
    btn.click(); c++;
    console.log(`진행: ${c-50}/50 (Day 2) | 전체: ${c}/100`);
    setTimeout(auto, 500);
  } else {
    console.error('버튼 없음');
  }
};
console.log('🚀 자동 클릭 시작...'); auto();
```

**확인 사항**:
- [ ] 99개 완료: 헤더 "49/50 (Day 2)"
- [ ] 100개 완료: **GenerationCompleteModal 표시**
- [ ] 모달 내용: "1차 단어장 완성!", 스킵 단어 개수 표시
- [ ] Supabase 확인:
  ```sql
  SELECT * FROM student_wordlists 
  WHERE student_id = '10000001-0000-0000-0000-000000000001'
  ORDER BY generation;
  -- 2차 단어장 생성 확인
  ```

---

### 테스트 5: 2차 단어장 학습
**목표**: 2차 단어장도 동일한 로직이 적용되는지 확인

**작업**:
1. GenerationCompleteModal에서 "학습 시작" 클릭
2. 페이지 새로고침 확인

**확인 사항**:
- [ ] 헤더: "2차" 배지
- [ ] 헤더: "Day 1" (2차의 Day 1)
- [ ] 헤더: "0/N" (N = 2차 단어장 단어 수)
- [ ] 2차 daily_goal만큼 완료 시 GoalAchievedModal 표시

---

## 🐛 예상 이슈 & 해결

### 이슈 1: "모든 단어 완료!" 표시
**증상**: 100개 완료하지 않았는데 "모든 단어 완료!" 메시지

**원인**: `get_next_word` 함수가 단어를 찾지 못함

**해결**:
```sql
-- Supabase에서 확인
SELECT * FROM get_next_word(
  '10000001-0000-0000-0000-000000000001'::uuid
);

-- 단어 부족 시 추가
-- ADD-MORE-WORDS.sql 실행
```

### 이슈 2: Day 번호가 이상함
**증상**: Day 2가 아니라 Day 3으로 표시

**확인**:
```javascript
// F12 Console
const progress = /* 현재 progress 상태 */;
console.log('completed:', progress.generationCompleted);
console.log('daily_goal:', progress.todayGoal);
console.log('Day:', Math.floor(progress.generationCompleted / progress.todayGoal) + 1);
```

---

## 📊 테스트 체크리스트

### 핵심 기능
- [ ] 초기 로드 시 Day 1, 0/50 표시
- [ ] 50개 완료 시 GoalAchievedModal 표시
- [ ] 51개 완료 시 모달 안 뜸
- [ ] 페이지 새로고침 시 Day 2, 1/50 표시
- [ ] 100개 완료 시 GenerationCompleteModal 표시
- [ ] 2차 단어장 생성 및 학습 가능

### 엣지 케이스
- [ ] 날짜가 바뀌어도 Day 번호 일관성 유지
- [ ] 브라우저 새로고침 후에도 진행률 정확
- [ ] 모른다 클릭 후에도 진행률 정상
- [ ] 50, 100, 150... 배수에서만 모달 표시

---

## 🎯 성공 기준

✅ **모든 테스트 통과 시**: 학생 대시보드 구현으로 진행  
❌ **일부 실패 시**: 로직 재검토 및 수정

---

**작성일**: 2025-10-28  
**다음 단계**: 학생 대시보드 구현

