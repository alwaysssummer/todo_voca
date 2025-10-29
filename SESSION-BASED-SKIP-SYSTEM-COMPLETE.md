# ✅ 회차 기반 Skip 시스템 구현 완료

## 🎯 **목표**
날짜 기반이 아닌 **회차(Session) 기반**으로 Skip 단어 재등장 로직을 구현하여, 같은 날 여러 회차를 진행해도 안정적으로 작동하도록 개선.

---

## 📋 **구현 내용**

### **Phase 1: DB 스키마 추가**
- `student_word_progress` 테이블에 `last_studied_session` 컬럼 추가
- 인덱스 추가로 성능 최적화
- 기존 데이터 마이그레이션

**파일:** `PHASE1-ADD-LAST-STUDIED-SESSION.sql`

### **Phase 2: DB 함수 수정**
- `get_next_word` 함수를 회차 기반으로 수정
- `p_current_session` 파라미터 추가
- Skip 단어는 `last_studied_session < p_current_session`일 때만 등장

**파일:** `PHASE2-UPDATE-GET-NEXT-WORD-SESSION-BASED.sql`

### **Phase 3: TypeScript 코드 수정**
- `handleKnow`: `last_studied_session` 기록
- `handleDontKnow`: `last_studied_session` 기록
- `fetchNextWord`: `p_current_session` 파라미터 전달

**파일:** `hooks/useStudySession.ts`

---

## 🚀 **배포 순서**

### **1. Supabase에서 SQL 실행**

#### **Step 1: Phase 1 실행**
```sql
-- PHASE1-ADD-LAST-STUDIED-SESSION.sql 내용 복사 후 실행
ALTER TABLE student_word_progress
ADD COLUMN IF NOT EXISTS last_studied_session INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_swp_last_studied_session 
ON student_word_progress(student_id, last_studied_session);

UPDATE student_word_progress
SET last_studied_session = 0
WHERE last_studied_session IS NULL;
```

**확인:**
```sql
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN last_studied_session = 0 THEN 1 END) as not_studied_yet
FROM student_word_progress;
```

#### **Step 2: Phase 2 실행**
```sql
-- PHASE2-UPDATE-GET-NEXT-WORD-SESSION-BASED.sql 내용 복사 후 실행
DROP FUNCTION IF EXISTS get_next_word(UUID, UUID);

CREATE OR REPLACE FUNCTION get_next_word(
  p_student_id UUID, 
  p_assignment_id UUID,
  p_current_session INT DEFAULT 1
)
...
```

**확인:**
```sql
-- 함수가 올바르게 생성되었는지 확인
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'get_next_word';
-- pronargs = 3 (3개 파라미터)
```

### **2. 프론트엔드 재시작**
```bash
# 터미널에서 Ctrl+C로 중지 후 재시작
npm run dev
```

---

## 🧪 **테스트 시나리오**

### **Scenario 1: 기본 Skip 동작**
1. 1회차에서 word_8 skip
2. word_9로 넘어감 ✅ (word_8 재등장 안 함)
3. word_10, word_11, ... 학습
4. 1회차 완료 (10개)
5. 2회차 시작 → word_8이 먼저 등장 ✅

**예상 로그:**
```
❌ word_8: 1회 Skip (1회차) → 다음 회차에 우선 등장
✅ 다음 단어 로드: word_9 (sequence: 9)  ← word_8이 아님! ✅
...
🎯 1회차 완료! (10개)
✅ 다음 단어 로드: word_8 (sequence: 8)  ← 2회차 시작, word_8 재등장 ✅
```

### **Scenario 2: 같은 단어 반복 Skip**
1. 1회차에서 word_13 skip
2. 2회차에서 word_13 다시 skip
3. 3회차에서 word_13 재등장

**예상 로그:**
```
❌ word_13: 1회 Skip (1회차)
✅ 다음 단어 로드: word_14
...
❌ word_13: 2회 Skip (2회차)
✅ 다음 단어 로드: word_14
...
❌ word_13: 3회 Skip (3회차)
✅ 다음 단어 로드: word_14
```

### **Scenario 3: 여러 단어 Skip**
1. 1회차에서 word_8, word_13, word_20 skip
2. 2회차 시작 → word_8, word_13, word_20이 순서대로 우선 등장

---

## ✅ **핵심 로직**

### **DB 함수 (`get_next_word`)**
```sql
WHERE ...
  AND (
    -- 아직 학습 안 한 단어
    swp.last_studied_session IS NULL 
    OR swp.last_studied_session = 0
    -- 이전 회차에서 skip한 단어
    OR (
      swp.status = 'skipped' 
      AND swp.last_studied_session < p_current_session
    )
  )
ORDER BY 
  -- Skip 단어 우선
  CASE 
    WHEN swp.status = 'skipped' THEN 0 
    ELSE 1 
  END,
  w.sequence_order ASC
```

### **프론트엔드 (`handleDontKnow`)**
```typescript
await supabase
  .from('student_word_progress')
  .upsert({
    status: 'skipped',
    last_studied_session: currentSession,  // ⭐ 현재 회차 기록
    ...
  })
```

### **프론트엔드 (`fetchNextWord`)**
```typescript
const { data } = await supabase
  .rpc('get_next_word', {
    p_student_id: student.id,
    p_assignment_id: currentAssignment.id,
    p_current_session: progress.session  // ⭐ 현재 회차 전달
  })
```

---

## 🎁 **장점**

1. **회차 기반 명확성**
   - 날짜에 의존하지 않음
   - 같은 날 여러 회차 진행 가능

2. **Skip 단어 재등장 보장**
   - 현재 회차에서 skip → 다음 회차에 우선 등장
   - 무한 반복 방지

3. **확장 가능**
   - `last_studied_session`으로 학습 통계 분석 가능
   - 나중에 "N회차 후 재등장" 같은 로직 추가 가능

4. **안정성**
   - DB에서 회차를 명확히 관리
   - 프론트엔드 상태 동기화 문제 없음

---

## 📊 **데이터베이스 스키마**

### **`student_word_progress` 테이블**
```sql
CREATE TABLE student_word_progress (
  student_id UUID,
  word_id INT,
  status VARCHAR,
  skip_count INT DEFAULT 0,
  last_studied_session INT DEFAULT 0,  -- ⭐ 새로 추가
  next_appear_date DATE,               -- 기록용
  completed_date DATE,                 -- 기록용
  updated_at TIMESTAMP,
  PRIMARY KEY (student_id, word_id)
);
```

---

## 🔄 **마이그레이션 참고**

### **기존 데이터 처리**
- 기존 `student_word_progress` 레코드는 `last_studied_session = 0`으로 초기화
- 새로운 학습부터 회차가 올바르게 기록됨

### **롤백 (필요시)**
```sql
-- Phase 2 롤백: 이전 함수로 복구
DROP FUNCTION IF EXISTS get_next_word(UUID, UUID, INT);
-- (이전 함수 정의 복원)

-- Phase 1 롤백: 컬럼 삭제
ALTER TABLE student_word_progress
DROP COLUMN IF EXISTS last_studied_session;

DROP INDEX IF EXISTS idx_swp_last_studied_session;
```

---

## 📝 **관련 파일**

- `PHASE1-ADD-LAST-STUDIED-SESSION.sql`
- `PHASE2-UPDATE-GET-NEXT-WORD-SESSION-BASED.sql`
- `hooks/useStudySession.ts`
- `SESSION-BASED-SKIP-SYSTEM-COMPLETE.md` (이 문서)

---

## ✨ **구현 완료 일자**
2025-10-29

## 👤 **구현자**
AI Assistant (Claude Sonnet 4.5)

