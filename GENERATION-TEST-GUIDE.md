# 🧪 세대별 단어장 시스템 v2 테스트 가이드

> 📅 작성일: 2025-10-28  
> 🎯 목표: 1차→2차→3차 자동 생성 플로우 완벽 테스트

---

## ✅ 사전 준비사항

### 1. 데이터베이스 마이그레이션 완료 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'student_wordlists' 
  AND column_name IN ('generation', 'base_wordlist_id', 'filtered_word_ids', 'daily_goal');
```

✅ **예상 결과**: 4개 컬럼 모두 존재

### 2. get_next_word 함수 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_next_word';
```

✅ **예상 결과**: `get_next_word` 함수 존재

### 3. 서버 재시작
```bash
# 터미널에서 Ctrl+C로 서버 중지 후 재시작
npm run dev
```

✅ **예상 결과**: 오류 없이 서버 시작

---

## 🎬 테스트 시나리오

### 시나리오 1: 1차 단어장 학습 (기본 플로우)

#### Step 1: 학생 학습 페이지 접속
```
URL: http://localhost:3000/s/[학생토큰]
```

#### Step 2: 헤더 확인
- ✅ "1차" 배지 표시
- ✅ "Day 1" 표시
- ✅ "오늘 목표: 0/50" 표시
- ✅ "세대 진행률: 0/300 (0%)" 표시
- ✅ 단어장 이름 표시

#### Step 3: 단어 학습
1. **"안다" 버튼 10번 클릭**
   - ✅ 오늘 목표: 10/50
   - ✅ 세대 진행률: 10/300
   - ✅ 완료 목록에 10개 단어 표시

2. **"모른다" 버튼 5번 클릭**
   - ✅ Skip 모달 표시 (1-2회: Minimal, 3-4회: Medium)
   - ✅ "내일 다시" 버튼 클릭
   - ✅ 오늘 목표는 증가하지 않음
   - ✅ 세대 진행률은 증가하지 않음

3. **"안다" 40번 더 클릭 (총 50개 완료)**
   - ✅ 50개 완료 시 "목표 달성 모달" 표시
   - ✅ Day 1 완성 단어장 생성
   - ✅ "온라인 테스트 시작" 버튼 표시

#### Step 4: 온라인 테스트
1. **"온라인 테스트 시작" 클릭**
   - ✅ 테스트 문제 10개 (50개의 20%)
   - ✅ 5분 타이머 작동
   - ✅ 테스트 완료 후 결과 표시

2. **테스트 완료 후 "학습으로 돌아가기"**
   - ✅ Day 2 시작
   - ✅ 오늘 목표: 0/50
   - ✅ 세대 진행률: 50/300

---

### 시나리오 2: 1차 단어장 완료 → 2차 생성

#### Step 1: 1차 단어장 모든 단어 완료
- 총 300개 단어 중 280개 "안다", 20개 "모른다" (Skip)
- 6일차 (50×6=300개) 완료 시점

#### Step 2: 세대 완료 모달 확인
```
✅ 표시 내용:
- "1차 단어장 완료!"
- "현재 세대: 1차 → 다음 세대: 2차"
- "복습이 필요한 단어: 20개"
- "2차 단어장 시작하기" 버튼
```

#### Step 3: 2차 단어장 시작
1. **"2차 단어장 시작하기" 클릭**
   - ✅ 페이지 새로고침
   - ✅ 헤더에 "2차" 보라색 배지 표시
   - ✅ "복습 20개" 표시
   - ✅ Day 1로 초기화
   - ✅ 오늘 목표: 0/30 (자동 계산: 20개 → 30개)
   - ✅ 세대 진행률: 0/20

2. **Skip한 20개 단어만 학습**
   - ✅ 1차에서 Skip한 단어만 등장
   - ✅ 1차에서 "안다"고 한 단어는 나오지 않음

---

### 시나리오 3: 2차 → 3차 → 완벽 암기

#### 2차 단어장 (20개 → 5개 Skip)
- 15개 "안다" + 5개 "모른다"
- ✅ 2차 완료 시 "3차 단어장 생성" 모달
- ✅ "복습이 필요한 단어: 5개"

#### 3차 단어장 (5개 → 0개 Skip)
- 5개 모두 "안다"
- ✅ 3차 완료 시 "완벽 암기 완료!" 모달
- ✅ 🏆 아이콘과 "Skip한 단어: 0개" 표시
- ✅ "복습이 필요한 단어가 없습니다"

---

## 🔍 데이터베이스 검증 쿼리

### 1. student_wordlists 확인 (세대별)
```sql
SELECT 
  sw.id,
  u.name as student_name,
  w.name as wordlist_name,
  sw.generation,
  sw.daily_goal,
  sw.is_auto_generated,
  COALESCE(array_length(sw.filtered_word_ids, 1), 0) as filtered_count,
  sw.assigned_at
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.base_wordlist_id = w.id
ORDER BY u.name, sw.generation;
```

**예상 결과** (시나리오 완료 후):
```
김철수 | 기초 영단어 | 1 | 50 | FALSE | 0   | 2025-10-28
김철수 | 기초 영단어 | 2 | 30 | TRUE  | 20  | 2025-10-28
김철수 | 기초 영단어 | 3 | 30 | TRUE  | 5   | 2025-10-28
```

### 2. completed_wordlists 확인 (Day별)
```sql
SELECT 
  u.name as student_name,
  cwl.generation,
  cwl.day_number,
  array_length(cwl.word_ids, 1) as word_count,
  cwl.completed_date,
  cwl.online_test_completed
FROM completed_wordlists cwl
JOIN users u ON cwl.student_id = u.id
ORDER BY u.name, cwl.generation, cwl.day_number;
```

**예상 결과**:
```
김철수 | 1 | 1 | 50 | 2025-10-28 | TRUE
김철수 | 1 | 2 | 50 | 2025-10-29 | TRUE
...
김철수 | 2 | 1 | 20 | 2025-11-03 | TRUE
```

### 3. Skip 단어 확인
```sql
SELECT 
  u.name as student_name,
  w.word_text,
  swp.skip_count,
  swp.status,
  swp.next_appear_date
FROM student_word_progress swp
JOIN users u ON swp.student_id = u.id
JOIN words w ON swp.word_id = w.id
WHERE swp.skip_count > 0
ORDER BY u.name, swp.skip_count DESC;
```

---

## ⚠️ 예상 문제 및 해결

### 문제 1: "다음 단어를 불러올 수 없습니다"
**원인**: `get_next_word` 함수가 v2가 아님

**해결**:
```sql
-- lib/supabase/function-get-next-word-v2.sql 전체 실행
```

### 문제 2: "세대 진행률: 0/0 (NaN%)"
**원인**: `filtered_word_ids`나 `total_words` 데이터 없음

**해결**:
```sql
-- wordlist의 total_words 업데이트
UPDATE wordlists 
SET total_words = (SELECT COUNT(*) FROM words WHERE wordlist_id = wordlists.id)
WHERE total_words IS NULL OR total_words = 0;
```

### 문제 3: 2차 단어장이 자동 생성되지 않음
**원인**: Hook의 `createNextGeneration` 오류

**해결**:
1. 브라우저 콘솔 확인 (F12)
2. 터미널 로그 확인
3. `console.log` 메시지 확인

### 문제 4: "헤더에 1차 배지가 안 보임"
**원인**: `currentAssignment`가 null

**해결**:
```sql
-- student_wordlists 데이터 확인
SELECT * FROM student_wordlists WHERE student_id = '학생UUID';
```

---

## 📊 성공 기준

### ✅ Phase 1: 기본 플로우
- [ ] 1차 단어장 학습 정상 작동
- [ ] Day 완료 시 온라인 테스트 생성
- [ ] 진행률 정확히 표시

### ✅ Phase 2: 세대 시스템
- [ ] 1차 완료 시 2차 자동 생성
- [ ] Skip한 단어만 2차에 포함
- [ ] daily_goal 자동 계산 정상

### ✅ Phase 3: 완벽 암기
- [ ] 3차 완료 시 완벽 암기 모달 표시
- [ ] 4차 단어장 생성되지 않음
- [ ] 모든 데이터베이스 기록 정확

---

## 🚀 다음 단계

테스트 완료 후:
1. ✅ 버그 수정
2. ✅ Teacher Dashboard에서 세대별 진행률 표시 추가 (선택)
3. ✅ 상세개발플랜 업데이트
4. 🎉 배포 준비!

---

**테스트 시작하세요!** 문제가 발생하면 즉시 알려주세요! 🎯

