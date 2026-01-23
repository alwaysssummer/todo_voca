'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { OnlineTest, StudentWordlistWithWordlist, DashboardData, AssignmentData } from '@/types/database'

export function useStudentDashboard(token: string) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        // 1. 학생 정보 먼저 조회 (다른 쿼리에서 student.id 필요)
        const { data: student, error: studentError } = await supabase
          .from('users')
          .select('id, name, daily_goal')
          .eq('access_token', token)
          .eq('role', 'student')
          .single<{ id: string; name: string; daily_goal: number }>()

        if (studentError) throw studentError
        if (!student) throw new Error('학생을 찾을 수 없습니다')

        // 2. 배정된 단어장 + 완성된 회차 병렬 조회 (둘 다 student.id만 필요)
        type CompletedSessionRow = {
          id: string
          session_number: number
          generation: number
          assignment_id: string
          word_ids: number[]
          unknown_word_ids: number[] | null
          completed_date: string
          online_test_completed: boolean
          online_tests: OnlineTest[] | null
        }

        const [assignmentsResult, completedSessionsResult] = await Promise.all([
          // 배정된 단어장 조회
          supabase
            .from('student_wordlists')
            .select(`
              id,
              generation,
              wordlist_id,
              filtered_word_ids,
              base_wordlist_id,
              is_auto_generated,
              wordlists!wordlist_id (
                name,
                total_words
              )
            `)
            .eq('student_id', student.id)
            .order('assigned_at', { ascending: true })
            .returns<StudentWordlistWithWordlist[]>(),
          // 완성된 회차 목록 조회
          supabase
            .from('completed_wordlists')
            .select(`
              id,
              session_number,
              generation,
              assignment_id,
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
            .order('session_number', { ascending: false })
            .returns<CompletedSessionRow[]>()
        ])

        const { data: assignmentsRaw, error: assignmentError } = assignmentsResult
        const { data: completedSessions, error: sessionsError } = completedSessionsResult

        if (assignmentError) throw assignmentError
        if (!assignmentsRaw || assignmentsRaw.length === 0) {
          throw new Error('배정된 단어장이 없습니다')
        }
        if (sessionsError) throw sessionsError

        // 3. 각 단어장별 완료 단어 수 계산
        const assignments: AssignmentData[] = await Promise.all(
          assignmentsRaw.map(async (assignment) => {
            // ⭐ 대상 단어 ID 결정 (해당 단어장의 단어만 카운트하도록!)
            let targetWordIds: number[] = []

            if (assignment.filtered_word_ids && assignment.filtered_word_ids.length > 0) {
              // 복습 단어장: filtered_word_ids 사용
              targetWordIds = assignment.filtered_word_ids
            } else {
              // 일반 단어장: words 테이블에서 해당 단어장의 단어 ID 조회
              const { data: wordsData } = await supabase
                .from('words')
                .select('id')
                .eq('wordlist_id', assignment.wordlist_id)

              targetWordIds = wordsData?.map((w: { id: number }) => w.id) || []
            }

            // 완료된 단어 수 계산 (해당 단어장 단어만)
            let completedCount = 0
            if (targetWordIds.length > 0) {
              const { count } = await supabase
                .from('student_word_progress')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', student.id)
                .eq('status', 'completed')
                .in('word_id', targetWordIds)

              completedCount = count || 0
            }

            const wordlistData = assignment.wordlists
            const isReview = assignment.is_auto_generated || assignment.generation > 1

            return {
              id: assignment.id,
              generation: assignment.generation,
              wordlist_id: assignment.wordlist_id,
              wordlist_name: wordlistData?.name || 'Unknown',
              total_words: assignment.filtered_word_ids?.length || wordlistData?.total_words || 0,
              completed_words: completedCount || 0,
              filtered_word_ids: assignment.filtered_word_ids,
              base_wordlist_id: assignment.base_wordlist_id || null,
              is_review: isReview
            }
          })
        )

        // 원본 단어장만 먼저, 복습은 나중에 (동일 base_wordlist_id 기준)
        const sortedAssignments = [...assignments].sort((a, b) => {
          // 복습이 아닌 것을 먼저
          if (a.is_review !== b.is_review) {
            return a.is_review ? 1 : -1
          }
          return 0
        })

        // 4. 완성된 회차 데이터 변환 (이미 위에서 병렬 조회됨)
        const formattedSessions = (completedSessions || []).map(session => {
          const tests = session.online_tests as OnlineTest[] | null
          const oTest = tests?.find((t) => t.test_type === 'known')
          const xTest = tests?.find((t) => t.test_type === 'unknown')

          return {
            id: session.id,
            session_number: session.session_number,
            generation: session.generation,
            assignment_id: session.assignment_id,
            word_count: session.word_ids?.length || 0,
            unknown_count: session.unknown_word_ids?.length || 0,
            completed_date: session.completed_date,
            test_completed: session.online_test_completed,
            test_score: session.online_tests?.[0]?.score || null,
            o_test_completed: !!oTest,
            o_test_correct: oTest?.correct_count ?? 0,
            o_test_total: oTest?.total_questions ?? 0,
            o_test_wrong_word_ids: oTest?.wrong_word_ids || null,
            x_test_completed: !!xTest,
            x_test_correct: xTest?.correct_count ?? 0,
            x_test_total: xTest?.total_questions ?? 0,
            x_test_wrong_word_ids: xTest?.wrong_word_ids || null
          }
        })

        setData({
          student: {
            id: student.id,
            name: student.name,
            session_goal: student.daily_goal
          },
          assignments: sortedAssignments,
          currentAssignment: sortedAssignments[0] || null,  // 하위 호환성
          completedSessions: formattedSessions
        })

        setLoading(false)
      } catch (err) {
        console.error('대시보드 로드 실패:', err)
        const error = err as Error & { code?: string; details?: string; hint?: string }
        console.error('에러 상세:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setError(error)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token])

  return { data, loading, error }
}
