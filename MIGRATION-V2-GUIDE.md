# 🚀 세대별 단어장 시스템 v2 마이그레이션 가이드

> 📅 작성일: 2025-10-28  
> ⚠️ **중요**: 이 마이그레이션은 데이터베이스 구조를 변경합니다. 백업을 권장합니다.

---

## 📋 변경 사항 요약

### 핵심 개념
- **Day**: `daily_goal`개 완료 (20-100개, 세대별 설정 가능)
- **Generation (세대)**: 1차 → 2차 → 3차 ... (Skip이 0이 될 때까지)
- **50개마다**: `completed_wordlist` + 온라인 테스트
- **세대 완료 시**: Skip한 단어로 다음 세대 자동 생성

### 데이터베이스 변경
1. `student_wordlists`:
   - ❌ 기존 UNIQUE 제약 제거
   - ✅ 새 컬럼 6개 추가 (generation, daily_goal 등)
   - ✅ 새 UNIQUE 제약 (student_id, base_wordlist_id, generation)

2. `completed_wordlists`:
   - ✅ assignment_id, generation 컬럼 추가

---

## 🚨 마이그레이션 전 체크리스트

- [ ] Supabase SQL Editor 접속 완료
- [ ] (권장) 현재 데이터 백업 완료
- [ ] `migration-v2-final.sql` 파일 확인

---

## 📝 마이그레이션 실행 (Supabase SQL Editor)

### 방법 1: 전체 실행 (권장)

`lib/supabase/migration-v2-final.sql` 파일 내용을 **전체 복사**해서 Supabase SQL Editor에 붙여넣고 실행하세요.

✅ **예상 결과**:
```
✅ student_wordlists 마이그레이션 완료!
total_assignments: 3
generation_1_count: 3
auto_generated_count: 0

✅ completed_wordlists 마이그레이션 완료!
total_completed: 1
with_assignment_id: 1
```

### 방법 2: 단계별 실행 (문제 발생 시)

<details>
<summary>Step 1: UNIQUE 제약 제거</summary>

```sql
ALTER TABLE student_wordlists 
DROP CONSTRAINT IF EXISTS student_wordlists_student_id_wordlist_id_key;
```

✅ Success 메시지 확인
</details>

<details>
<summary>Step 2: 컬럼 추가</summary>

```sql
ALTER TABLE student_wordlists 
ADD COLUMN IF NOT EXISTS base_wordlist_id UUID REFERENCES wordlists(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS generation INT DEFAULT 1 CHECK (generation > 0),
ADD COLUMN IF NOT EXISTS parent_assignment_id UUID REFERENCES student_wordlists(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS filtered_word_ids INT[],
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_goal INT DEFAULT 50 CHECK (daily_goal BETWEEN 20 AND 100),
ADD COLUMN IF NOT EXISTS generation_created_at TIMESTAMP WITH TIME ZONE;
```

✅ Success 메시지 확인
</details>

<details>
<summary>Step 3: 기존 데이터 마이그레이션</summary>

```sql
UPDATE student_wordlists 
SET 
  base_wordlist_id = COALESCE(base_wordlist_id, wordlist_id),
  generation = COALESCE(generation, 1),
  is_auto_generated = COALESCE(is_auto_generated, FALSE),
  generation_created_at = COALESCE(generation_created_at, assigned_at),
  daily_goal = COALESCE(daily_goal, 50)
WHERE base_wordlist_id IS NULL OR generation IS NULL;
```

✅ "UPDATE X" 메시지 확인 (X = 업데이트된 행 수)
</details>

<details>
<summary>Step 4-8: 인덱스 및 completed_wordlists</summary>

나머지 SQL도 순서대로 실행하세요.
</details>

---

## ✅ 마이그레이션 검증

### 1. student_wordlists 확인
```sql
SELECT 
  s.name as student_name,
  w.name as wordlist_name,
  sw.generation,
  sw.daily_goal,
  sw.is_auto_generated,
  COALESCE(array_length(sw.filtered_word_ids, 1), 0) as filtered_words
FROM student_wordlists sw
JOIN users s ON sw.student_id = s.id
JOIN wordlists w ON sw.base_wordlist_id = w.id
ORDER BY s.name, sw.generation;
```

**예상 결과**:
```
student_name | wordlist_name | generation | daily_goal | is_auto_generated | filtered_words
김철수       | 기초 영단어   | 1          | 50         | FALSE             | 0
이영희       | 기초 영단어   | 1          | 50         | FALSE             | 0
```

### 2. completed_wordlists 확인
```sql
SELECT 
  u.name as student_name,
  cwl.generation,
  cwl.day_number,
  array_length(cwl.word_ids, 1) as word_count,
  cwl.assignment_id IS NOT NULL as has_assignment
FROM completed_wordlists cwl
JOIN users u ON cwl.student_id = u.id
ORDER BY u.name, cwl.generation, cwl.day_number;
```

**예상 결과**: 모든 행의 `has_assignment = TRUE`

---

## ⚠️ 문제 해결

### 문제 1: "UNIQUE constraint violation"
```
ERROR: duplicate key value violates unique constraint
```

**원인**: 이미 같은 student_id + base_wordlist_id + generation 조합 존재

**해결**:
```sql
-- 중복 확인
SELECT student_id, base_wordlist_id, generation, COUNT(*)
FROM student_wordlists
GROUP BY student_id, base_wordlist_id, generation
HAVING COUNT(*) > 1;

-- 중복 삭제 (최신 것만 유지)
DELETE FROM student_wordlists
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY student_id, base_wordlist_id, generation 
      ORDER BY assigned_at DESC
    ) as rn
    FROM student_wordlists
  ) t WHERE rn > 1
);
```

### 문제 2: "assignment_id is NULL"
```
completed_wordlists에 assignment_id가 NULL
```

**원인**: 매칭되는 student_wordlists 없음

**해결**:
```sql
-- NULL인 행 확인
SELECT * FROM completed_wordlists WHERE assignment_id IS NULL;

-- 수동 매칭 (student_id + wordlist_id 기준)
UPDATE completed_wordlists cwl
SET assignment_id = (
  SELECT id FROM student_wordlists 
  WHERE student_id = cwl.student_id 
  AND base_wordlist_id = cwl.wordlist_id
  AND generation = 1
  LIMIT 1
)
WHERE assignment_id IS NULL;
```

---

## 🔄 롤백 (문제 발생 시)

```sql
-- STEP 1: UNIQUE 제약 복원
ALTER TABLE student_wordlists
ADD CONSTRAINT student_wordlists_student_id_wordlist_id_key
UNIQUE (student_id, wordlist_id);

-- STEP 2: 새 컬럼 삭제
ALTER TABLE student_wordlists
DROP COLUMN IF EXISTS generation CASCADE,
DROP COLUMN IF EXISTS base_wordlist_id CASCADE,
DROP COLUMN IF EXISTS parent_assignment_id CASCADE,
DROP COLUMN IF EXISTS filtered_word_ids CASCADE,
DROP COLUMN IF EXISTS is_auto_generated CASCADE,
DROP COLUMN IF EXISTS daily_goal CASCADE,
DROP COLUMN IF EXISTS generation_created_at CASCADE;

-- STEP 3: completed_wordlists 컬럼 삭제
ALTER TABLE completed_wordlists
DROP COLUMN IF EXISTS assignment_id CASCADE,
DROP COLUMN IF EXISTS generation CASCADE;
```

---

## ✅ 마이그레이션 완료 후

1. **브라우저 새로고침**: Ctrl+F5
2. **학생 학습 페이지 확인**: 헤더에 "1차" 표시 확인
3. **Teacher Dashboard 확인**: 정상 작동 확인
4. **다음 단계**: 코드 업데이트 (자동 진행됨)

---

**마이그레이션 완료를 알려주세요!** 🎉

