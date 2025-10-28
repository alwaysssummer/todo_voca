export interface OnlineTest {
  id: string
  student_id: string
  completed_wordlist_id: string
  test_date: string
  total_questions: number
  correct_count: number
  score: number
  wrong_word_ids: number[]
  test_duration_seconds?: number
  created_at: string
}

export interface Question {
  wordId: number
  word: string
  correctAnswer: string
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

