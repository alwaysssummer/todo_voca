/**
 * Supabase Database Types
 * 자동 생성 대체용 타입 정의
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// Table Types
// ============================================================

export interface User {
  id: string
  name: string
  role: 'teacher' | 'student'
  email: string | null
  password_hash: string | null
  access_token: string | null
  daily_goal: number
  display_order?: number
  created_at: string
  updated_at: string
}

export interface Wordlist {
  id: string
  name: string
  total_words: number
  created_by: string
  created_at: string
  updated_at?: string
  display_order?: number
  // 복습 단어장 구분 필드
  is_review?: boolean
  source_wordlist_id?: string | null
  created_for_student_id?: string | null
}

export interface Word {
  id: number
  wordlist_id: string
  word_text: string
  meaning: string
  example?: string
  example_translation?: string
  mnemonic?: string
  audio_url?: string
  sequence_order: number
  created_at: string
}

export interface StudentWordlist {
  id: string
  student_id: string
  wordlist_id: string
  base_wordlist_id: string
  generation: number
  parent_assignment_id: string | null
  filtered_word_ids: number[] | null
  daily_goal: number
  is_auto_generated: boolean
  assigned_by: string
  assigned_at: string
  current_session: number
}

export interface StudentWordProgress {
  id: string
  student_id: string
  word_id: number
  status: 'not_started' | 'skipped' | 'completed'
  skip_count: number
  last_studied_session?: number
  completed_date?: string
  next_appear_date?: string
  user_note?: string
  help_provided_count: number
  intensive_completed_count: number
  created_at: string
  updated_at: string
}

export interface CompletedWordlist {
  id: string
  student_id: string
  wordlist_id: string
  assignment_id: string
  generation: number
  session_number: number
  word_ids: number[]
  unknown_word_ids: number[] | null
  completed_date: string
  online_test_completed: boolean
  created_at: string
}

export interface OnlineTest {
  id: string
  student_id: string
  completed_wordlist_id: string
  test_type: 'known' | 'unknown'  // O-TEST = known, X-TEST = unknown
  test_date: string
  total_questions: number
  correct_count: number
  score: number
  wrong_word_ids: number[] | null
  test_duration_seconds?: number
  created_at: string
}

// ============================================================
// Test Types
// ============================================================

export interface Question {
  wordId: number
  word: string
  correctAnswer: string
  options: string[]  // 4개 선택지 (정답 + 오답 3개)
}

export interface WrongWord {
  wordId: number
  word: string
  studentAnswer: string
  correctAnswer: string
}

export interface TestResult {
  score: number
  correctCount: number
  totalQuestions: number
  wrongWords: WrongWord[]
  correctWords: string[]
}

// ============================================================
// Session Types (useStudySession용)
// ============================================================

export interface SessionStudent {
  id: string
  name: string
  session_goal: number  // 회차당 목표
}

export interface SessionAssignment {
  id: string
  wordlist_id: string
  base_wordlist_id: string
  generation: number
  parent_assignment_id: string | null
  filtered_word_ids: number[] | null
  is_auto_generated: boolean
  session_goal: number  // 회차당 목표
  assigned_by: string  // 강사 ID
  current_session: number  // 현재 회차 번호 (DB에서 관리)
}

export interface SessionProgress {
  today: number  // 현재 회차에서 완료한 단어 수
  todayGoal: number  // 현재 회차 목표 (20)
  generationCompleted: number  // 전체 완료 단어 수 (누적)
  generationTotal: number  // 단어장 전체 단어 수
  session: number  // 현재 회차 번호 (DB current_session)
}

export interface PendingTest {
  hasPendingTest: boolean
  pendingTestId: string | null
}

// ============================================================
// Dashboard Types (useStudentDashboard용)
// ============================================================

// 개별 단어장 배정 정보
export interface AssignmentData {
  id: string
  generation: number
  wordlist_id: string
  wordlist_name: string
  total_words: number
  completed_words: number
  filtered_word_ids: number[] | null
  base_wordlist_id: string | null  // 원본 단어장 ID (복습용)
  is_review: boolean  // 복습 단어장 여부
}

export interface DashboardData {
  student: {
    id: string
    name: string
    session_goal: number  // 회차당 목표
  }
  // 여러 단어장 지원
  assignments: AssignmentData[]
  // 하위 호환성을 위해 currentAssignment 유지 (첫 번째 단어장)
  currentAssignment: AssignmentData | null
  completedSessions: Array<{
    id: string
    session_number: number  // 회차 번호
    generation: number
    word_count: number
    unknown_count: number  // 모른다 단어 개수
    completed_date: string
    test_completed: boolean
    test_score: number | null
    assignment_id: string
    // O-TEST (아는 단어 평가)
    o_test_completed: boolean
    o_test_correct: number | null
    o_test_total: number | null
    o_test_wrong_word_ids: number[] | null
    // X-TEST (모르는 단어 평가)
    x_test_completed: boolean
    x_test_correct: number | null
    x_test_total: number | null
    x_test_wrong_word_ids: number[] | null
  }>
}

// ============================================================
// Query Response Types (Supabase joins)
// ============================================================

/** student_wordlists with joined wordlist data */
export interface StudentWordlistWithWordlist extends StudentWordlist {
  wordlists: Pick<Wordlist, 'name' | 'total_words'> | null
}

/** completed_wordlists with joined online_tests */
export interface CompletedWordlistWithTests extends CompletedWordlist {
  online_tests: OnlineTest[] | null
}

// ============================================================
// Google Sheets Types
// ============================================================

/** Raw row data from Google Sheets (string array) */
export type SheetRow = (string | undefined)[]

/** Parsed word from Google Sheets */
export interface ParsedSheetWord {
  word_text: string
  meaning: string
  mnemonic?: string
  example?: string
  example_translation?: string
}

/** Complete sheet data with title and words */
export interface SheetData {
  title: string
  words: ParsedSheetWord[]
}

// ============================================================
// UI/Form Types
// ============================================================

/** Generation completion modal data */
export interface GenerationModalData {
  currentGeneration?: number
  skippedCount: number
  nextGenerationCreated: boolean
  perfectCompletion: boolean
}

// ============================================================
// Database Schema (for Supabase client)
// ============================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<User>
      }
      wordlists: {
        Row: Wordlist
        Insert: Omit<Wordlist, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Wordlist>
      }
      words: {
        Row: Word
        Insert: Omit<Word, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Word>
      }
      student_wordlists: {
        Row: StudentWordlist
        Insert: Omit<StudentWordlist, 'id' | 'assigned_at' | 'current_session'> & {
          id?: string
          assigned_at?: string
          current_session?: number
        }
        Update: Partial<StudentWordlist>
      }
      student_word_progress: {
        Row: StudentWordProgress
        Insert: Omit<StudentWordProgress, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<StudentWordProgress>
      }
      completed_wordlists: {
        Row: CompletedWordlist
        Insert: Omit<CompletedWordlist, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<CompletedWordlist>
      }
      online_tests: {
        Row: OnlineTest
        Insert: Omit<OnlineTest, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<OnlineTest>
      }
    }
  }
}
