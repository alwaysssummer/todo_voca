'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardData {
  student: {
    id: string
    name: string
    session_goal: number  // 회차당 목표
  }
  currentAssignment: {
    generation: number
    wordlist_id: string
    wordlist_name: string
    total_words: number
    completed_words: number
    filtered_word_ids: string[] | null
  }
  completedSessions: Array<{
    id: string
    session_number: number  // 회차 번호
    generation: number
    word_count: number
    unknown_count: number  // 모른다 단어 개수
    completed_date: string
    test_completed: boolean
    test_score: number | null
    // O-TEST (아는 단어 평가)
    o_test_completed: boolean
    o_test_correct: number | null
    o_test_total: number | null
    o_test_wrong_word_ids: string[] | null
    // X-TEST (모르는 단어 평가)
    x_test_completed: boolean
    x_test_correct: number | null
    x_test_total: number | null
    x_test_wrong_word_ids: string[] | null
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

        // 4. 완성된 회차 목록 (모든 세대)
        const { data: completedSessions, error: sessionsError } = await supabase
          .from('completed_wordlists')
          .select(`
            id,
            session_number,
            generation,
            word_ids,
            unknown_word_ids,
            completed_date,
            online_test_completed,
            online_tests (
              test_type,
              correct_count,
              total_questions,
              score,
              wrong_word_ids
            )
          `)
          .eq('student_id', student.id)
          .order('session_number', { ascending: false })  // ⭐ 최신순으로 정렬

        if (sessionsError) throw sessionsError

        // 완성된 회차 데이터 변환
        const formattedSessions = (completedSessions || []).map(session => {
          // O-TEST, X-TEST 분리
          const oTest = session.online_tests?.find((t: any) => t.test_type === 'known')
          const xTest = session.online_tests?.find((t: any) => t.test_type === 'unknown')
          
          return {
            id: session.id,
            session_number: session.session_number,
            generation: session.generation,
            word_count: session.word_ids?.length || 0,
            unknown_count: session.unknown_word_ids?.length || 0,
            completed_date: session.completed_date,
            test_completed: session.online_test_completed,
            test_score: session.online_tests?.[0]?.score || null,
            // O-TEST (아는 단어 평가)
            o_test_completed: !!oTest,
            o_test_correct: oTest?.correct_count ?? 0,
            o_test_total: oTest?.total_questions ?? 0,
            o_test_wrong_word_ids: oTest?.wrong_word_ids || null,
            // X-TEST (모르는 단어 평가)
            x_test_completed: !!xTest,
            x_test_correct: xTest?.correct_count ?? 0,
            x_test_total: xTest?.total_questions ?? 0,
            x_test_wrong_word_ids: xTest?.wrong_word_ids || null
          }
        })

        // Supabase 관계형 데이터 안전하게 접근
        const wordlistData = (assignment as any).wordlists
        
        setData({
          student: {
            id: student.id,
            name: student.name,
            session_goal: student.daily_goal
          },
          currentAssignment: {
            generation: assignment.generation,
            wordlist_id: assignment.wordlist_id,
            wordlist_name: wordlistData?.name || 'Unknown',
            total_words: wordlistData?.total_words || 0,
            completed_words: completedCount || 0,
            filtered_word_ids: assignment.filtered_word_ids
          },
          completedSessions: formattedSessions
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

