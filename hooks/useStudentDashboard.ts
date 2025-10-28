'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardData {
  student: {
    id: string
    name: string
    daily_goal: number
  }
  currentAssignment: {
    generation: number
    wordlist_name: string
    total_words: number
    completed_words: number
    filtered_word_ids: string[] | null
  }
  completedDays: Array<{
    id: string
    day_number: number
    generation: number
    word_count: number
    completed_date: string
    test_completed: boolean
    test_score: number | null
  }>
}

export function useStudentDashboard(token: string) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        // 1. 학생 정보
        const { data: student, error: studentError } = await supabase
          .from('users')
          .select('id, name, daily_goal')
          .eq('access_token', token)
          .eq('role', 'student')
          .single()

        if (studentError) throw studentError
        if (!student) throw new Error('학생을 찾을 수 없습니다')

        // 2. 현재 assignment (최신 세대)
        const { data: assignment, error: assignmentError } = await supabase
          .from('student_wordlists')
          .select(`
            generation,
            wordlist_id,
            filtered_word_ids,
            wordlists!wordlist_id (
              name,
              total_words
            )
          `)
          .eq('student_id', student.id)
          .order('generation', { ascending: false })
          .limit(1)
          .single()

        if (assignmentError) throw assignmentError
        if (!assignment) throw new Error('배정된 단어장이 없습니다')

        // 3. 세대별 완료 단어 수 계산
        let completedQuery = supabase
          .from('student_word_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .eq('status', 'completed')

        if (assignment.filtered_word_ids && assignment.filtered_word_ids.length > 0) {
          completedQuery = completedQuery.in('word_id', assignment.filtered_word_ids)
        }

        const { count: completedCount } = await completedQuery

        // 4. 완성된 Day 목록 (모든 세대)
        const { data: completedDays, error: daysError } = await supabase
          .from('completed_wordlists')
          .select(`
            id,
            day_number,
            generation,
            word_ids,
            completed_date,
            online_test_completed,
            online_tests (
              score
            )
          `)
          .eq('student_id', student.id)
          .order('generation', { ascending: true })
          .order('day_number', { ascending: true })

        if (daysError) throw daysError

        // 완성된 Day 데이터 변환
        const formattedDays = (completedDays || []).map(day => ({
          id: day.id,
          day_number: day.day_number,
          generation: day.generation,
          word_count: day.word_ids?.length || 0,
          completed_date: day.completed_date,
          test_completed: day.online_test_completed,
          test_score: day.online_tests?.[0]?.score || null
        }))

        // Supabase 관계형 데이터 안전하게 접근
        const wordlistData = (assignment as any).wordlists
        
        setData({
          student: {
            id: student.id,
            name: student.name,
            daily_goal: student.daily_goal
          },
          currentAssignment: {
            generation: assignment.generation,
            wordlist_name: wordlistData?.name || 'Unknown',
            total_words: wordlistData?.total_words || 0,
            completed_words: completedCount || 0,
            filtered_word_ids: assignment.filtered_word_ids
          },
          completedDays: formattedDays
        })

        setLoading(false)
      } catch (err: any) {
        console.error('대시보드 로드 실패:', err)
        console.error('에러 상세:', {
          message: err?.message,
          code: err?.code,
          details: err?.details,
          hint: err?.hint
        })
        setError(err as Error)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token])

  return { data, loading, error }
}

