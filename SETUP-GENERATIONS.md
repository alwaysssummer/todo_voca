# 세대별 단어장 시스템 설치 가이드

> 📅 작성일: 2025-10-28  
> 🎯 목적: 1차→2차→3차 자동 복습 단어장 생성 시스템

---

## 🚀 빠른 시작

### 1단계: Supabase SQL Editor 열기

Supabase 대시보드 → SQL Editor로 이동

### 2단계: 마이그레이션 실행 (순서대로)

#### A. 스키마 마이그레이션

`lib/supabase/migration-add-generations.sql` 파일 내용을 복사해서 실행:

```sql
-- student_wordlists 테이블 확장
ALTER TABLE student_wordlists 
ADD COLUMN IF NOT EXISTS base_wordlist_id UUID REFERENCES wordlists(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS generation INT DEFAULT 1 CHECK (generation > 0),
ADD COLUMN IF NOT EXISTS parent_assignment_id UUID REFERENCES student_wordlists(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS filtered_word_ids INT[],
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS generation_created_at TIMESTAMP WITH TIME ZONE;

-- 기존 데이터 마이그레이션
UPDATE student_wordlists 
SET 
  base_wordlist_id = wordlist_id,
  generation = 1,
  is_auto_generated = FALSE,
  generation_created_at = assigned_at
WHERE base_wordlist_id IS NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_student_wordlists_generation 
ON student_wordlists(student_id, generation);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_parent 
ON student_wordlists(parent_assignment_id);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_base 
ON student_wordlists(base_wordlist_id);

CREATE INDEX IF NOT EXISTS idx_student_wordlists_auto 
ON student_wordlists(student_id, is_auto_generated);

-- 유니크 제약 조건
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_wordlists_unique_generation 
ON student_wordlists(student_id, base_wordlist_id, generation);
```

✅ **확인**: "Success. No rows returned" 메시지가 나오면 성공

---

#### B. get_next_word 함수 업데이트

`lib/supabase/function-get-next-word-v2.sql` 파일 내용을 복사해서 실행:

```sql
-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_next_word(UUID, UUID);

-- 새 함수 생성
CREATE OR REPLACE FUNCTION get_next_word(
  p_student_id UUID, 
  p_assignment_id UUID
)
RETURNS TABLE (
    id INT,
    wordlist_id UUID,
    word_text VARCHAR,
    meaning TEXT,
    example TEXT,
    example_translation TEXT,
    mnemonic TEXT,
    audio_url TEXT,
    sequence_order INT
) AS $$
DECLARE
    v_wordlist_id UUID;
    v_filtered_word_ids INT[];
BEGIN
    SELECT 
        sw.wordlist_id,
        sw.filtered_word_ids
    INTO 
        v_wordlist_id,
        v_filtered_word_ids
    FROM student_wordlists sw
    WHERE sw.id = p_assignment_id
      AND sw.student_id = p_student_id;
    
    IF v_wordlist_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        w.id, 
        w.wordlist_id, 
        w.word_text, 
        w.meaning, 
        w.example, 
        w.example_translation, 
        w.mnemonic, 
        w.audio_url, 
        w.sequence_order
    FROM words w
    LEFT JOIN student_word_progress swp 
      ON w.id = swp.word_id 
      AND swp.student_id = p_student_id
    WHERE w.wordlist_id = v_wordlist_id
      AND (v_filtered_word_ids IS NULL OR w.id = ANY(v_filtered_word_ids))
      AND (
        swp.status IS NULL 
        OR swp.status = 'not_started'
        OR (swp.status = 'skipped' AND (swp.next_appear_date IS NULL OR swp.next_appear_date <= CURRENT_DATE))
      )
    ORDER BY w.sequence_order ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
```

✅ **확인**: "Success. No rows returned" 메시지가 나오면 성공

---

## 🧪 테스트 쿼리

### 현재 assignments 확인

```sql
SELECT 
  u.name as student_name,
  w.name as wordlist_name,
  sw.generation,
  sw.is_auto_generated,
  COALESCE(array_length(sw.filtered_word_ids, 1), 0) as word_count,
  sw.assigned_at
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.wordlist_id = w.id
ORDER BY u.name, sw.generation;
```

### 세대별 진행 상황 확인

```sql
SELECT 
  u.name as student_name,
  w.name as wordlist_name,
  sw.generation as "세대",
  COUNT(DISTINCT swp.word_id) FILTER (WHERE swp.status = 'completed' AND swp.completed_date = CURRENT_DATE) as "오늘완료",
  COALESCE(array_length(sw.filtered_word_ids, 1), COUNT(DISTINCT words.id)) as "전체단어"
FROM student_wordlists sw
JOIN users u ON sw.student_id = u.id
JOIN wordlists w ON sw.base_wordlist_id = w.id
LEFT JOIN words ON words.wordlist_id = sw.wordlist_id
LEFT JOIN student_word_progress swp ON swp.student_id = sw.student_id 
  AND (sw.filtered_word_ids IS NULL OR swp.word_id = ANY(sw.filtered_word_ids))
WHERE u.role = 'student'
GROUP BY u.name, w.name, sw.generation, sw.filtered_word_ids
ORDER BY u.name, sw.generation;
```

---

## 🎯 작동 방식

### 1차 단어장 (원본)
```
학생: 김철수
단어장: 기초 영단어 100
- generation: 1
- filtered_word_ids: NULL (전체 100개)
- is_auto_generated: FALSE
```

### 2차 단어장 (자동 생성)
```
10개 학습 완료 → 3개 "모른다" 체크
→ 시스템이 자동으로 2차 생성

- generation: 2
- filtered_word_ids: [5, 12, 23]  (모른 단어 ID)
- is_auto_generated: TRUE
- parent_assignment_id: (1차 ID)
```

### 3차 단어장 (자동 생성)
```
2차 3개 학습 완료 → 1개 "모른다" 체크
→ 시스템이 자동으로 3차 생성

- generation: 3
- filtered_word_ids: [12]  (여전히 모르는 단어)
- is_auto_generated: TRUE
- parent_assignment_id: (2차 ID)
```

---

## ⚠️ 주의사항

1. **마이그레이션 순서 준수**: A → B 순서대로 실행
2. **백업 권장**: 프로덕션 환경이라면 먼저 백업
3. **RLS 정책**: 기존 RLS 정책이 student_wordlists에 있다면 확인 필요

---

## 🐛 문제 해결

### Q: 마이그레이션 실행 시 "column already exists" 오류
A: 정상입니다. `IF NOT EXISTS`로 보호되어 있어 무시하고 진행하면 됩니다.

### Q: get_next_word 함수가 작동하지 않음
A: 
1. 함수가 제대로 생성되었는지 확인
2. `SELECT * FROM get_next_word('학생UUID', 'assignment UUID');` 로 직접 테스트

### Q: 2차 단어장이 자동 생성되지 않음
A:
1. 브라우저 콘솔에서 로그 확인
2. `student_word_progress` 테이블에 skip_count > 0인 데이터가 있는지 확인

---

## ✅ 설치 완료 체크리스트

- [ ] migration-add-generations.sql 실행 완료
- [ ] function-get-next-word-v2.sql 실행 완료
- [ ] 테스트 쿼리로 기존 데이터 확인
- [ ] 브라우저에서 학생 학습 페이지 열림 확인
- [ ] 헤더에 세대 정보 표시 확인

---

**설치가 완료되었습니다! 🎉**

이제 학생이 10개를 완료하고 일부를 "모른다"로 체크하면  
자동으로 2차 복습 단어장이 생성됩니다.

