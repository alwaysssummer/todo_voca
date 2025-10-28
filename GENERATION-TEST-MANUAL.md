# 🎯 세대 완료 테스트 매뉴얼

## 📋 테스트 개요

**목적**: 1차 단어장 100개 완료 → `GenerationCompleteModal` 확인 → 2차 단어장 자동 생성 확인

**현재 상태**: 51/100 단어 완료 (김철수 학생)

**남은 작업**: 49개 단어 완료

---

## 🚀 테스트 진행 방법

### 1️⃣ 학생 학습 페이지 접속

```
http://localhost:3000/s/10000001-0000-0000-0000-000000000001
```

### 2️⃣ 현재 상태 확인

헤더에서 다음 정보를 확인:
- ✅ 이름: "김철수"
- ✅ Day: "Day 2" 또는 "Day 3" (51개 완료 상태)
- ✅ 세대: "1차" 배지
- ✅ 오늘 목표: "51/50" (목표 초과)
- ✅ 세대 진행률: "51/100 (51%)"

### 3️⃣ 49개 단어 완료

**방법 1: 수동 클릭**
- "안다" 버튼을 49번 클릭
- 각 클릭마다 진행률 증가 확인

**방법 2: 브라우저 콘솔 자동화**
1. 브라우저에서 F12 눌러 개발자 도구 열기
2. Console 탭으로 이동
3. 아래 스크립트 복사 & 붙여넣기 & Enter:

```javascript
// 자동으로 49개 단어 완료하는 스크립트
let clickCount = 0;
const targetClicks = 49;

const autoClick = () => {
  if (clickCount >= targetClicks) {
    console.log('✅ 49개 완료! 세대 완료 모달을 확인하세요.');
    return;
  }
  
  const knowButton = document.querySelector('button:not([variant])');
  if (knowButton && knowButton.textContent.includes('안다')) {
    knowButton.click();
    clickCount++;
    console.log(`${clickCount}/${targetClicks} 클릭 완료 (전체: ${51 + clickCount}/100)`);
    
    // 다음 클릭을 위해 500ms 대기 (애니메이션 고려)
    setTimeout(autoClick, 500);
  } else {
    console.error('❌ "안다" 버튼을 찾을 수 없습니다.');
  }
};

console.log('🚀 자동 클릭 시작...');
autoClick();
```

---

## 📊 예상 결과

### ✅ 100개 완료 시 (예상)

#### 1. Generation Complete Modal 표시

**모달 내용 (스킵한 단어가 있는 경우)**:
```
✅ 1차 단어장 완료!

이번 세대의 모든 단어를 학습했습니다.
X개의 모르는 단어로
다음 2차 복습 단어장이 생성되었습니다.

현재 세대: 1차
모르는 단어: X개

[다음 세대 학습 시작!] 버튼
[닫기] 버튼
```

**모달 내용 (스킵한 단어가 0개인 경우)**:
```
🎉 완벽 암기 달성! 🎉

모든 단어를 완벽하게 암기했습니다!
더 이상 복습할 단어가 없습니다.

[닫기] 버튼
```

#### 2. 콘솔 로그 확인

브라우저 콘솔에서 다음 로그 확인:
```
✅ 1차 세대 완료! 총 100개 단어 학습 완료
🎯 다음 세대 생성 중...
✅ 2차 단어장 생성 완료! (X개 단어)
```

또는 (완벽 암기인 경우):
```
✅ 1차 세대 완료! 총 100개 단어 학습 완료
🎉 완벽 암기 달성! 스킵한 단어가 0개입니다.
```

#### 3. 헤더 업데이트 (모달 닫은 후)

- 세대 배지: "1차" → "2차"
- 오늘 목표: "0/50" (새로운 세대 시작)
- 세대 진행률: "0/X (0%)" (X = 스킵한 단어 개수)
- 단어장 이름: "기초 영단어 100 (X개 선별)" 또는 유사한 표시

---

## 🔍 검증 항목

### ✅ UI 검증

- [ ] `GenerationCompleteModal`이 100개 완료 시 정확히 표시됨
- [ ] 모달에 현재 세대 번호 (1차) 표시
- [ ] 모달에 스킵한 단어 개수 정확히 표시
- [ ] "다음 세대 학습 시작!" 또는 "완벽 암기" 메시지 표시
- [ ] 모달 닫기 버튼 정상 작동

### ✅ 데이터 검증

**Supabase에서 확인**:

1. **student_wordlists 테이블**:
```sql
SELECT 
  id,
  generation,
  base_wordlist_id,
  parent_assignment_id,
  filtered_word_ids,
  is_auto_generated
FROM student_wordlists
WHERE student_id = '10000001-0000-0000-0000-000000000001'
ORDER BY generation;
```

**예상 결과**:
- 1차 단어장 (generation=1, is_auto_generated=false)
- 2차 단어장 (generation=2, is_auto_generated=true, parent_assignment_id=1차ID)
- 2차 단어장의 `filtered_word_ids`에 스킵한 단어 ID만 포함

2. **completed_wordlists 테이블**:
```sql
SELECT 
  day_number,
  generation,
  word_ids,
  completed_date
FROM completed_wordlists
WHERE student_id = '10000001-0000-0000-0000-000000000001'
ORDER BY generation, day_number;
```

**예상 결과**:
- Day 1 (generation=1, 50개 단어)
- Day 2 (generation=1, 50개 단어)
- 총 100개 완료 확인

### ✅ 로직 검증

- [ ] 1차 단어장 100개 완료 감지 정상
- [ ] 스킵한 단어 수집 정상
- [ ] 2차 단어장 자동 생성 정상
- [ ] `parent_assignment_id` 연결 정상
- [ ] `base_wordlist_id` 동일 유지
- [ ] 세대 번호 증가 (1 → 2)

---

## 🐛 문제 발생 시 체크리스트

### ❌ 모달이 뜨지 않는 경우

1. 콘솔 에러 확인 (F12 → Console)
2. 네트워크 요청 확인 (F12 → Network)
3. 정확히 100개 완료했는지 확인 (헤더의 진행률)

### ❌ 2차 단어장이 생성되지 않는 경우

1. Supabase에서 `student_wordlists` 테이블 확인
2. RLS 정책 비활성화 상태 확인
3. `migration-v2-final.sql` 실행 여부 확인

### ❌ 데이터가 이상한 경우

초기화 후 다시 테스트:
```sql
-- Supabase SQL Editor에서 실행
-- 파일: QUICK-RESET.sql 내용 실행
```

---

## 📈 테스트 결과 기록

### 기록 양식

**테스트 일시**: ________________

**테스트 환경**:
- 브라우저: ________________
- Next.js 서버 상태: ________________

**테스트 결과**:

1. **100개 완료 시**:
   - [ ] GenerationCompleteModal 표시됨
   - [ ] 스킵한 단어 개수: ___개
   - [ ] 2차 단어장 생성됨: 예/아니오
   - [ ] 세대 번호 업데이트: 예/아니오

2. **Supabase 검증**:
   - [ ] student_wordlists에 2차 단어장 존재
   - [ ] filtered_word_ids 정확함
   - [ ] parent_assignment_id 연결됨

3. **문제 발생**:
   - 없음 / 다음 내용: ________________

4. **스크린샷**:
   - GenerationCompleteModal 캡처
   - Supabase 데이터 캡처

---

## 🎉 성공 기준

✅ **모든 항목이 통과되어야 합니다**:

1. 100개 완료 시 `GenerationCompleteModal` 정상 표시
2. 스킵한 단어 개수 정확히 계산
3. 2차 단어장 자동 생성 (스킵한 단어가 있는 경우)
4. 완벽 암기 메시지 표시 (스킵한 단어가 0개인 경우)
5. 헤더의 세대 정보 업데이트
6. Supabase 데이터 정확성

---

**테스트를 시작하려면 위의 URL로 접속하여 "안다" 버튼을 49번 클릭하세요!** 🚀

