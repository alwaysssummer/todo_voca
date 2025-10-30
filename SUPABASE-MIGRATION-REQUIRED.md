# ⚠️ Supabase 마이그레이션 필수 실행!

## 🚨 중요: 다음 단계 진행 전 반드시 실행하세요

코드가 정상 작동하려면 **Supabase 데이터베이스에 컬럼을 추가**해야 합니다.

---

## 📋 실행 방법

### 1️⃣ Supabase 대시보드 접속
```
https://supabase.com/dashboard
```

### 2️⃣ 프로젝트 선택
Todo Voca 프로젝트 선택

### 3️⃣ SQL Editor 이동
왼쪽 메뉴 → **SQL Editor**

### 4️⃣ 다음 SQL 복사 & 실행

```sql
-- ===================================================================
-- Todo Voca: online_tests 테이블 test_type 컬럼 추가
-- 작성일: 2025-10-30
-- 목적: O-TEST(아는 단어)와 X-TEST(모르는 단어) 구분
-- ===================================================================

-- STEP 1: test_type 컬럼 추가
ALTER TABLE online_tests
ADD COLUMN IF NOT EXISTS test_type TEXT CHECK (test_type IN ('known', 'unknown'));

-- STEP 2: 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_online_tests_type 
ON online_tests(completed_wordlist_id, test_type);

-- STEP 3: 컬럼 설명 추가
COMMENT ON COLUMN online_tests.test_type IS 'O-TEST(known) 또는 X-TEST(unknown) 구분';

-- STEP 4: 확인
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'online_tests'
AND column_name = 'test_type';
```

### 5️⃣ 결과 확인
마지막 SELECT 쿼리에서 다음과 같은 결과가 나와야 합니다:

```
column_name | data_type | column_default
------------|-----------|---------------
test_type   | text      | NULL
```

---

## ✅ 실행 완료 후

1. **브라우저 새로고침**
2. **평가 테스트**:
   - O-TEST 진행 → 결과 확인
   - X-TEST 진행 → 결과 확인
3. **대시보드 확인**:
   - 초록색 원 + 점수 표시되는지
   - 주황색 원 + 점수 표시되는지

---

## 🔍 변경 내용 요약

### 코드 변경
1. **최소 문제 수**: 5개 → 3개
   - O-TEST(30%) 비율에 더 가깝게
   - 예: 10개 단어 → 3문제 (정확히 30%)

2. **test_type 저장**: 
   - O-TEST: `test_type: 'known'`
   - X-TEST: `test_type: 'unknown'`
   - 평가 완료 후 데이터베이스에 저장

3. **대시보드 표시**:
   - 평가 전: 회색 원 버튼 (⚪)
   - 평가 후: 
     - O-TEST: 초록 원 + 점수 (🟢 9/10)
     - X-TEST: 주황 원 + 점수 (🟠 12/14)

---

## 📊 예상 결과

### 문제 수 변화
| 단어 수 | 이전 (최소 5) | 현재 (최소 3) | 비율 |
|--------|--------------|--------------|------|
| 10개 | 5문제 (50%) | 3문제 (30%) ✅ | 30% |
| 15개 | 5문제 (33%) | 4문제 (27%) | ~30% |
| 20개 | 6문제 (30%) | 6문제 (30%) | 30% |
| 30개 | 9문제 (30%) | 9문제 (30%) | 30% |

---

## 🎯 파일 위치

마이그레이션 SQL 파일:
```
lib/supabase/add-test-type-column.sql
```

수정된 Hook:
```
hooks/useOnlineTest.ts
```

수정된 Dashboard:
```
components/student/dashboard.tsx
hooks/useStudentDashboard.ts
```

---

## ⚠️ 주의사항

1. **기존 테스트 데이터**:
   - 이미 완료된 평가는 `test_type`이 `NULL`
   - 새로운 평가부터 정상 작동

2. **롤백 방법**:
   ```bash
   git reset --hard HEAD~1
   ```

3. **문제 발생 시**:
   - SQL 실행 중 에러 → 스크린샷 공유
   - 코드 에러 → 콘솔 로그 공유

---

**SQL 실행 완료 후 알려주세요!** 🚀

