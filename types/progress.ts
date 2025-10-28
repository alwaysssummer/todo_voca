export interface StudentWordProgress {
  id: string
  student_id: string
  word_id: number
  status: 'not_started' | 'skipped' | 'completed'
  skip_count: number
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
  day_number: number
  word_ids: number[]
  completed_date: string
  online_test_completed: boolean
  online_test_score?: number
  created_at: string
}

