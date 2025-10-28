-- 기존 강사 계정 삭제
DELETE FROM users WHERE role = 'teacher';

-- 새 강사 계정 생성 (teacher / 7136)
INSERT INTO users (id, name, role, email, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', '김선생', 'teacher', 'teacher', '7136');

-- 확인
SELECT id, name, role, email, password_hash FROM users WHERE role = 'teacher';
