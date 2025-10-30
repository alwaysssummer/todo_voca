-- Todo Voca 데이터베이스 스키마 (단순화 버전)

-- 1. users 테이블 (사용자 - 강사/학생)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('teacher', 'student')),
    
    -- 강사 전용 (1명만 존재)
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    
    -- 학생 전용
    access_token UUID UNIQUE DEFAULT gen_random_uuid(),
    daily_goal INT DEFAULT 50,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_access_token ON users(access_token);

-- 2. wordlists 테이블 (단어장 마스터)
CREATE TABLE wordlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    total_words INT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wordlists_created_by ON wordlists(created_by);

-- 3. words 테이블 (단어 마스터)
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    wordlist_id UUID REFERENCES wordlists(id) ON DELETE CASCADE,
    word_text VARCHAR(100) NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT,
    example_translation TEXT,
    mnemonic TEXT,
    audio_url TEXT,
    sequence_order INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wordlist_id, sequence_order)
);

CREATE INDEX idx_words_wordlist ON words(wordlist_id);
CREATE INDEX idx_words_sequence ON words(wordlist_id, sequence_order);

-- 4. student_wordlists 테이블 (학생-단어장 배정)
CREATE TABLE student_wordlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wordlist_id UUID REFERENCES wordlists(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, wordlist_id)
);

CREATE INDEX idx_student_wordlists_student ON student_wordlists(student_id);
CREATE INDEX idx_student_wordlists_wordlist ON student_wordlists(wordlist_id);

-- 5. student_word_progress 테이블 (학생별 단어 진도)
CREATE TABLE student_word_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word_id INT REFERENCES words(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('not_started', 'skipped', 'completed')) DEFAULT 'not_started',
    skip_count INT DEFAULT 0,
    completed_date DATE,
    next_appear_date DATE,
    user_note TEXT,
    help_provided_count INT DEFAULT 0,
    intensive_completed_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, word_id)
);

CREATE INDEX idx_progress_student ON student_word_progress(student_id);
CREATE INDEX idx_progress_status ON student_word_progress(status);
CREATE INDEX idx_progress_next_date ON student_word_progress(next_appear_date);
CREATE INDEX idx_progress_composite ON student_word_progress(student_id, status, next_appear_date);

-- 6. completed_wordlists 테이블 (완성 단어장 - Session 단위)
CREATE TABLE completed_wordlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wordlist_id UUID REFERENCES wordlists(id) ON DELETE CASCADE,
    session_number INT NOT NULL,          -- day_number에서 session_number로 변경
    word_ids INT[] NOT NULL,              -- 안다고 표시한 단어 ID 배열
    unknown_word_ids INT[],               -- 모른다고 표시한 단어 ID 배열 (X-TEST용)
    completed_date DATE NOT NULL,
    online_test_completed BOOLEAN DEFAULT FALSE,
    online_test_score INT,
    assignment_id UUID REFERENCES student_wordlists(id) ON DELETE CASCADE,
    generation INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_completed_student ON completed_wordlists(student_id);
CREATE INDEX idx_completed_wordlist ON completed_wordlists(wordlist_id);

-- 7. online_tests 테이블 (온라인 평가 기록)
CREATE TABLE online_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    completed_wordlist_id UUID REFERENCES completed_wordlists(id) ON DELETE CASCADE,
    test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_questions INT NOT NULL,
    correct_count INT NOT NULL,
    score INT NOT NULL,
    wrong_word_ids INT[],
    test_duration_seconds INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_online_tests_student ON online_tests(student_id);
CREATE INDEX idx_online_tests_wordlist ON online_tests(completed_wordlist_id);

-- 8. offline_tests 테이블 (오프라인 시험 기록)
CREATE TABLE offline_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    completed_wordlist_ids UUID[],
    test_date DATE NOT NULL,
    total_questions INT NOT NULL,
    correct_count INT NOT NULL,
    wrong_word_ids INT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_offline_tests_teacher ON offline_tests(teacher_id);
CREATE INDEX idx_offline_tests_student ON offline_tests(student_id);

-- 함수: 다음 단어 가져오기
CREATE OR REPLACE FUNCTION get_next_word(p_student_id UUID, p_wordlist_id UUID)
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
BEGIN
    RETURN QUERY
    SELECT w.id, w.wordlist_id, w.word_text, w.meaning, 
           w.example, w.example_translation, w.mnemonic, 
           w.audio_url, w.sequence_order
    FROM words w
    LEFT JOIN student_word_progress swp 
      ON w.id = swp.word_id AND swp.student_id = p_student_id
    WHERE w.wordlist_id = p_wordlist_id
      AND (
        swp.status IS NULL 
        OR swp.status = 'not_started'
        OR (swp.status = 'skipped' AND swp.next_appear_date <= CURRENT_DATE)
      )
    ORDER BY w.sequence_order ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_wordlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_tests ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 학생은 자기 데이터만 조회/수정
CREATE POLICY student_own_data ON users
    FOR ALL
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY student_progress_policy ON student_word_progress
    FOR ALL
    TO authenticated
    USING (student_id = auth.uid());

-- 샘플 데이터 (강사 1명)
INSERT INTO users (name, role, email, password_hash) VALUES
('강사', 'teacher', 'teacher@todovoca.com', '$2a$10$SAMPLE_HASH');

-- 완료 메시지
SELECT 'Database schema created successfully!' AS message;

