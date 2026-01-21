-- student_wordlists.daily_goal 제약조건 변경 (20~100 → 5~100)
-- 학생별 회차당 완료 기준 5개, 10개, 15개도 허용

-- 기존 제약조건 삭제
ALTER TABLE student_wordlists
DROP CONSTRAINT IF EXISTS student_wordlists_daily_goal_check;

-- 새 제약조건 추가 (5~100 범위)
ALTER TABLE student_wordlists
ADD CONSTRAINT student_wordlists_daily_goal_check
CHECK (daily_goal BETWEEN 5 AND 100);

-- 변경 확인
COMMENT ON COLUMN student_wordlists.daily_goal IS '이 세대의 일일 학습 목표 (5-100개, 회차 완료 기준)';
