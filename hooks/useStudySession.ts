'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Word, Wordlist } from '@/types/word'
import type {
  GenerationModalData,
  SessionStudent,
  SessionAssignment,
  SessionProgress,
  PendingTest
} from '@/types/database'

// ===================================================================
// 순수 함수들 (유틸리티)
// ===================================================================

/**
 * 진행률 계산 (순수 함수)
 * @param completedCount - 완료한 단어 개수 (안다)
 * @param skippedCount - Skip한 단어 개수 (모른다)
 * @param sessionGoal - 회차당 목표 단어 개수
 * @param totalWords - 단어장 전체 단어 개수
 * @returns 계산된 진행률 정보
 */
function calculateProgress(
  completedCount: number,
  skippedCount: number,
  sessionGoal: number,
  totalWords: number
): {
  today: number
  todayGoal: number
  generationCompleted: number
  generationTotal: number
  session: number
} {
  const safeGoal = Math.max(1, sessionGoal || 1)
  const safeTotal = Math.max(0, totalWords || 0)
  const safeSkipped = Math.max(0, skippedCount || 0)

  if (safeTotal === 0) {
    return {
      today: 0,
      todayGoal: safeGoal,
      generationCompleted: 0,
      generationTotal: 0,
      session: 1
    }
  }

  const clampedCompleted = Math.max(0, Math.min(completedCount, safeTotal))

  // ⭐ studiedCount = 안다 + 모른다 (실제 학습한 단어 수)
  const studiedCount = Math.min(clampedCompleted + safeSkipped, safeTotal)

  // ⭐ 회차 계산: 학습한 총 단어 수 기준으로 계산 (안다+모른다)
  let currentSession: number
  if (studiedCount === 0) {
    currentSession = 1
  } else {
    // studiedCount 기준으로 회차 계산 (skip 단어 포함)
    currentSession = Math.floor(studiedCount / safeGoal) + 1
  }

  // ⭐ totalSessions 제한 제거 - skip 단어로 인해 추가 회차가 필요할 수 있음
  currentSession = Math.max(currentSession, 1)

  const wordsBeforeThisSession = Math.min((currentSession - 1) * safeGoal, safeTotal)
  const remainingWords = Math.max(0, safeTotal - wordsBeforeThisSession)
  const todayGoal = Math.min(safeGoal, remainingWords)

  let today = clampedCompleted - wordsBeforeThisSession
  if (today < 0) {
    today = 0
  }

  const effectiveTodayGoal = todayGoal > 0 ? todayGoal : safeGoal
  if (effectiveTodayGoal > 0) {
    today = Math.min(today, effectiveTodayGoal)
  }

  return {
    today,
    todayGoal: effectiveTodayGoal,
    generationCompleted: clampedCompleted,
    generationTotal: safeTotal,
    session: currentSession
  }
}

/**
 * ⭐ 회차 완료 체크 (개선 버전)
 * @param completedInSession - 현재 회차에서 완료한 단어 개수 (안다)
 * @param skippedInSession - 현재 회차에서 skip한 단어 개수 (모른다)
 * @param sessionGoal - 회차당 목표 단어 개수 (20)
 * @param hasMoreWords - 더 학습할 단어가 있는지 여부
 * @returns 회차 완료 여부
 */
function isSessionComplete(
  completedInSession: number,
  skippedInSession: number,
  sessionGoal: number,
  hasMoreWords: boolean
): boolean {
  if (hasMoreWords) {
    // 새 단어 있으면: 안다 >= 목표
    return completedInSession >= sessionGoal
  } else {
    // ⭐ 새 단어 없으면 (마지막 회차): 모른다가 0개일 때만 완료
    // 모른다 단어가 있으면 계속 재출제하여 모두 "안다"가 될 때까지 학습
    return skippedInSession === 0 && completedInSession > 0
  }
}

// ===================================================================
// 타입 별칭 (database.ts에서 import한 타입 사용)
// ===================================================================

type Student = SessionStudent
type Assignment = SessionAssignment
type Progress = SessionProgress

export function useStudySession(token: string, assignmentId?: string | null) {
  const [student, setStudent] = useState<Student | null>(null)
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null)
  const [currentWordlist, setCurrentWordlist] = useState<Wordlist | null>(null)
  const [currentWord, setCurrentWord] = useState<Word | null>(null)
  const [completedWords, setCompletedWords] = useState<Word[]>([])
  const [progress, setProgress] = useState<Progress>({ 
    today: 0, 
    todayGoal: 50, 
    generationCompleted: 0, 
    generationTotal: 0, 
    session: 1 
  })
  const [pendingTest, setPendingTest] = useState<PendingTest>({
    hasPendingTest: false,
    pendingTestId: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingReview, setIsGeneratingReview] = useState(false)  // ⭐ 중복 방지 플래그
  const [showGenerationCompleteModal, setShowGenerationCompleteModal] = useState(false)  // ⭐ 단어장 완료 모달
  const [generationModalData, setGenerationModalData] = useState<GenerationModalData | null>(null)  // ⭐ 단어장 완료 모달 데이터
  const isGeneratingReviewRef = useRef(false)  // ⭐ useRef로 즉시 중복 방지
  const targetWordIdsRef = useRef<number[] | null>(null)  // ⭐ targetWordIds 캐싱
  const targetWordIdsAssignmentIdRef = useRef<string | null>(null)  // ⭐ 캐시된 assignment ID 추적

  // ⭐ 다음 단어 프리페칭을 위한 ref
  const prefetchedNextWordRef = useRef<Word | null>(null)
  const isPrefetchingRef = useRef(false)

  // 학생 정보 및 현재 활성 assignment 가져오기
  useEffect(() => {
    async function fetchStudentAndAssignment() {
      try {
        // 1. 학생 정보 가져오기
        const { data: studentData, error: studentError } = await (supabase as any)
          .from('users')
          .select('id, name, daily_goal')
          .eq('access_token', token)
          .eq('role', 'student')
          .single()

        if (studentError) throw studentError
        if (!studentData) throw new Error('학생을 찾을 수 없습니다')
        
        // daily_goal을 session_goal로 매핑
        setStudent({
          id: studentData.id,
          name: studentData.name,
          session_goal: studentData.daily_goal
        })

        // 2. 현재 활성 assignment 가져오기 (⭐ current_session 포함)
        type RawAssignment = {
          id: string
          wordlist_id: string
          base_wordlist_id: string
          generation: number
          parent_assignment_id: string | null
          filtered_word_ids: number[] | null
          is_auto_generated: boolean
          daily_goal: number
          assigned_by: string | null
          current_session: number
        }
        const { data: assignments, error: assignmentError } = await (supabase as any)
          .from('student_wordlists')
          .select('id, wordlist_id, base_wordlist_id, generation, parent_assignment_id, filtered_word_ids, is_auto_generated, daily_goal, assigned_by, current_session')
          .eq('student_id', studentData.id)
          .order('generation', { ascending: false })
          .order('assigned_at', { ascending: false })

        if (assignmentError) throw assignmentError
        if (!assignments || assignments.length === 0) {
          throw new Error('배정된 단어장이 없습니다')
        }

        // daily_goal을 session_goal로 매핑, current_session 추가
        // assignmentId가 제공되면 해당 단어장 선택, 없으면 첫 번째 단어장
        const rawAssignment = assignmentId
          ? (assignments as RawAssignment[]).find((a: RawAssignment) => a.id === assignmentId) || assignments[0]
          : assignments[0]
        const assignment: Assignment = {
          ...rawAssignment,
          session_goal: rawAssignment.daily_goal,
          assigned_by: rawAssignment.assigned_by || '',
          current_session: rawAssignment.current_session || 1  // ⭐ DB에서 가져온 회차 번호
        }
        setCurrentAssignment(assignment)

        // 3. Wordlist 정보 가져오기
        const { data: wordlistData, error: wordlistError } = await (supabase as any)
          .from('wordlists')
          .select('id, name, total_words')
          .eq('id', assignment.wordlist_id)
          .single()

        if (wordlistError) throw wordlistError
        setCurrentWordlist(wordlistData)

        // 4. 진행률 계산
        await updateProgress(studentData.id, assignment, wordlistData)

        setLoading(false)
      } catch (err) {
        console.error('초기 로드 오류:', err)
        const message = err instanceof Error ? err.message : '데이터를 불러올 수 없습니다'
        setError(message)
        setLoading(false)
      }
    }

    fetchStudentAndAssignment()
  }, [token, assignmentId])

  // 초기 로딩 완료 후 첫 단어 가져오기
  useEffect(() => {
    console.log('🟡 [useEffect] 트리거됨:', {
      loading,
      hasStudent: !!student,
      hasCurrentAssignment: !!currentAssignment,
      currentWord: currentWord?.word_text || 'null',
      error,
      isGeneratingReview,
      showGenerationCompleteModal
    })
    
    // ⭐ 단어장 완료 모달이 표시 중이면 fetchNextWord 호출 안 함
    if (showGenerationCompleteModal) {
      console.log('🟡 [useEffect] 단어장 완료 모달 표시 중, fetchNextWord() 호출 안 함')
      return
    }
    
    if (!loading && student && currentAssignment && !currentWord && !error && !isGeneratingReview) {
      console.log('🟡 [useEffect] 조건 충족! fetchNextWord() 호출')
      fetchNextWord()
    } else {
      console.log('🟡 [useEffect] 조건 불충족, fetchNextWord() 호출 안 함')
    }
  }, [loading, student, currentAssignment, isGeneratingReview, showGenerationCompleteModal])  // ⭐ showGenerationCompleteModal 의존성 추가

  // ⭐ 진행률 업데이트 함수 (단순화 버전)
  const updateProgress = async (studentId: string, assignment: Assignment, wordlist: Wordlist) => {
    // A. 대상 단어 ID 목록 결정
    let targetWordIds = assignment.filtered_word_ids || []

    // ⭐ filtered_word_ids가 없으면 해당 단어장의 모든 단어 ID를 가져옴 (다른 단어장과 섞이지 않도록)
    if (targetWordIds.length === 0) {
      const { data: wordlistWords } = await (supabase as any)
        .from('words')
        .select('id')
        .eq('wordlist_id', wordlist.id)

      if (wordlistWords && wordlistWords.length > 0) {
        targetWordIds = wordlistWords.map((w: { id: number }) => w.id)
        console.log(`🔵 [updateProgress] 단어장 ${wordlist.id}의 단어 ${targetWordIds.length}개로 필터링`)
      }
    }

    // B. 현재 회차에서 완료한 단어 수 (안다만!)
    let completedInSessionQuery = supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .eq('last_studied_session', assignment.current_session)  // ⭐ 현재 회차만

    if (targetWordIds.length > 0) {
      completedInSessionQuery = completedInSessionQuery.in('word_id', targetWordIds)
    }

    const { count: completedInSession } = await completedInSessionQuery

    // C. 전체 완료 개수 (누적 - 표시용)
    let totalCompletedQuery = supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'completed')

    if (targetWordIds.length > 0) {
      totalCompletedQuery = totalCompletedQuery.in('word_id', targetWordIds)
    }

    const { count: totalCompleted } = await totalCompletedQuery

    // D. 단어장 전체 단어 수
    const generationTotal = assignment.filtered_word_ids?.length || wordlist.total_words

    // E. 진행률 설정 (단순화!)
    const newProgress: Progress = {
      today: completedInSession || 0,  // ⭐ 현재 회차에서 완료한 개수
      todayGoal: assignment.session_goal,  // ⭐ 고정 (20)
      generationCompleted: totalCompleted || 0,  // 전체 누적
      generationTotal: generationTotal,
      session: assignment.current_session  // ⭐ DB에서 가져온 회차 번호
    }

    setProgress(newProgress)

    // F. 평가 대기 체크
    const { data: pendingTestData } = await (supabase as any)
      .from('completed_wordlists')
      .select('id')
      .eq('student_id', studentId)
      .eq('online_test_completed', false)
      .order('session_number', { ascending: true })
      .limit(1)

    if (pendingTestData && pendingTestData.length > 0) {
      setPendingTest({
        hasPendingTest: true,
        pendingTestId: pendingTestData[0].id
      })
    } else {
      setPendingTest({
        hasPendingTest: false,
        pendingTestId: null
      })
    }

    // ⭐ 계산된 진행률 반환
    return newProgress
  }

  // 다음 단어 가져오기
  const fetchNextWord = async (forceRefresh = false) => {
    console.log('🔵 [fetchNextWord] 호출됨 - forceRefresh:', forceRefresh)
    if (!student || !currentAssignment) {
      console.log('🔵 [fetchNextWord] student 또는 currentAssignment 없음. 종료.')
      return
    }

    // ⭐ 비동기 작업 시작 시 assignment_id 캡처 (탭 전환 대응)
    const capturedAssignmentId = currentAssignment.id
    const capturedStudentId = student.id

    // ⭐ 이미 복습 생성 중이거나 단어장 완료 모달이 표시 중이면 중단
    if (isGeneratingReview || showGenerationCompleteModal) {
      console.log('🔵 [fetchNextWord] 이미 복습 생성 중이거나 단어장 완료 모달 표시 중. 종료.')
      return
    }

    // ⭐ forceRefresh: 회차 완료 후 진행률을 먼저 새로고침
    if (forceRefresh && currentWordlist) {
      const refreshedProgress = await updateProgress(capturedStudentId, currentAssignment, currentWordlist)
      console.log('📊 진행률 새로고침:', refreshedProgress)
      // ⭐ 비동기 작업 후 assignment 변경 검증
      if (!currentAssignment || currentAssignment.id !== capturedAssignmentId) {
        console.warn('⚠️ [fetchNextWord] assignment 변경 감지 (forceRefresh 후), 종료')
        return
      }
    }

    try {
      const currentSession = currentAssignment.current_session  // ⭐ DB에서 가져온 실제 회차 (progress.session은 비동기 업데이트 전일 수 있음)

      console.log('🔍 get_next_word 호출:', {
        student_id: capturedStudentId,
        assignment_id: capturedAssignmentId,
        current_session: currentSession,  // ⭐ 회차 전달
        currentWord: currentWord?.word_text || 'null'
      })

      const { data, error} = await (supabase as any)
        .rpc('get_next_word', {
          p_student_id: capturedStudentId,
          p_assignment_id: capturedAssignmentId,
          p_current_session: currentSession  // ⭐ 회차 전달
        })

      if (error) {
        console.error('❌ RPC 오류:', error)
        throw error
      }

      // ⭐ RPC 완료 후 assignment 변경 검증 (탭 전환 대응)
      if (!currentAssignment || currentAssignment.id !== capturedAssignmentId) {
        console.warn('⚠️ [fetchNextWord] assignment 변경 감지 (RPC 후), 결과 무시')
        return
      }

      if (data && data.length > 0) {
        console.log('✅ 다음 단어 로드:', data[0].word_text, '(sequence:', data[0].sequence_order + ')')
        console.log('🔵 [fetchNextWord] setCurrentWord 호출 - 단어:', data[0].word_text)
        setCurrentWord(data[0])
      } else {
        console.log('ℹ️ 더 이상 학습할 단어가 없습니다')
        console.log('🔵 [fetchNextWord] setCurrentWord(null) 호출')
        setCurrentWord(null)

        // ⭐ 단어가 없을 때 단어장 완료 체크
        // ⭐⭐⭐ 복습 단어장 생성은 handleKnow()에서만 수행 (Race Condition 방지)
        // ⭐⭐⭐ fetchNextWord()에서는 회차 전환만 처리
        if (currentWordlist) {
          console.log('🔵 [fetchNextWord] 단어장 완료 체크 시작...')
          const isComplete = await checkWordlistComplete()
          console.log('🔵 [fetchNextWord] 단어장 완료 체크 결과:', isComplete)
          if (isComplete) {
            console.log('🎉 단어장 학습 완료 감지! (복습 생성은 handleKnow에서 처리)')
            // ⭐⭐⭐ 복습 단어장 생성 로직 제거 - handleKnow()에서만 수행
            // 여기서는 아무것도 하지 않음 (handleKnow가 이미 처리함)
            return
          } else {
            // ⭐⭐⭐ 단어장 미완료 + 새 단어 없음 = 회차 완료 후 다음 회차 진행!
            console.log('🔄 [fetchNextWord] 단어장 미완료, 회차 완료 후 다음 회차 진행 확인...')

            // skip 단어 존재 확인
            const targetWordIds = await getTargetWordIds()
            const { count: skippedCount } = await (supabase as any)
              .from('student_word_progress')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', student.id)
              .eq('status', 'skipped')
              .in('word_id', targetWordIds)

            console.log(`🔍 Skip 단어 수: ${skippedCount}개`)

            if (skippedCount && skippedCount > 0) {
              console.log(`🔄 ${currentAssignment.current_session}회차 완료 처리 후 → ${currentAssignment.current_session + 1}회차로 전환!`)

              // ⭐⭐⭐ 회차 완료 시 완성 단어장 생성 (마지막 회차 처리)
              console.log(`📝 ${currentAssignment.current_session}회차 완성 단어장 생성...`)
              try {
                const completedData = await createCompletedWordlist(progress.generationCompleted)
                if (completedData) {
                  console.log(`✅ ${currentAssignment.current_session}회차 완성 단어장 생성 완료:`, completedData)
                } else {
                  console.log(`⚠️ 완성 단어장 생성 실패 또는 이미 존재`)
                }
              } catch (err) {
                console.error('❌ 완성 단어장 생성 오류:', err)
              }

              // ⭐ DB에서 회차 번호 증가
              const newSession = currentAssignment.current_session + 1
              const { error: updateError } = await (supabase as any)
                .from('student_wordlists')
                .update({ current_session: newSession })
                .eq('id', currentAssignment.id)

              if (updateError) {
                console.error('❌ 회차 번호 업데이트 실패:', updateError)
                return
              }

              console.log(`✅ 회차 자동 증가 완료: ${newSession}회차`)

              // ⭐ 로컬 상태 업데이트
              setCurrentAssignment({
                ...currentAssignment,
                current_session: newSession
              })

              // ⭐ 진행률 업데이트
              setProgress(prev => ({
                ...prev,
                session: newSession,
                today: 0  // 새 회차는 0부터 시작
              }))

              // ⭐ 새 회차의 단어 가져오기 (재귀 호출 대신 직접 RPC 호출)
              console.log(`🔵 [fetchNextWord] ${newSession}회차 첫 단어 로드...`)
              const { data: nextData, error: nextError } = await (supabase as any)
                .rpc('get_next_word', {
                  p_student_id: student.id,
                  p_assignment_id: currentAssignment.id,
                  p_current_session: newSession
                })

              if (nextError) {
                console.error('❌ 다음 회차 단어 로드 실패:', nextError)
                return
              }

              if (nextData && nextData.length > 0) {
                console.log(`✅ ${newSession}회차 첫 단어:`, nextData[0].word_text)
                setCurrentWord(nextData[0])
              } else {
                console.log(`⚠️ ${newSession}회차에도 단어 없음 (예상치 못한 상황)`)
              }

              return
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ 다음 단어 로드 실패:', err)
      setCurrentWord(null)
    }
  }

  // 오늘 완료한 단어 목록 가져오기
  const fetchTodayCompletedWords = async () => {
    if (!student || !currentAssignment) return

    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. 오늘 생성된 완성 단어장들의 단어만 표시
      const { data: todayCompletedWordlists } = await (supabase as any)
        .from('completed_wordlists')
        .select('word_ids')
        .eq('student_id', student.id)
        .eq('assignment_id', currentAssignment.id)
        .eq('completed_date', today)
        .order('session_number', { ascending: true })

      if (!todayCompletedWordlists || todayCompletedWordlists.length === 0) {
        setCompletedWords([])
        return
      }

      // 2. 모든 완성 단어장의 단어 ID 수집
      const allWordIds = todayCompletedWordlists.flatMap((wl: any) => wl.word_ids)

      if (allWordIds.length === 0) {
        setCompletedWords([])
        return
      }

      // 3. 단어 정보 조회
      const { data: wordsData, error } = await (supabase as any)
        .from('words')
        .select('id, word_text, meaning, wordlist_id')
        .in('id', allWordIds)

      if (error) throw error

      // 4. word_ids 순서대로 정렬 (완료 순서 유지)
      const orderedWords = allWordIds
        .map((id: number) => wordsData?.find((w: any) => w.id === id))
        .filter(Boolean)
        .reverse()  // 최근 완료한 단어가 위로

      setCompletedWords(orderedWords as Word[])
    } catch (err) {
      console.error('완료 단어 목록 로드 실패:', err)
    }
  }

  // 초기 단어 및 완료 목록 로드
  useEffect(() => {
    if (student && currentAssignment) {
      fetchNextWord()
      fetchTodayCompletedWords()
    }
  }, [student, currentAssignment])

  // ⭐ 다음 단어 프리페칭 함수
  const prefetchNextWord = async () => {
    if (!student || !currentAssignment || isPrefetchingRef.current) return
    if (isGeneratingReview || showGenerationCompleteModal) return

    isPrefetchingRef.current = true
    try {
      const currentSession = currentAssignment.current_session
      const { data, error } = await (supabase as any)
        .rpc('get_next_word', {
          p_student_id: student.id,
          p_assignment_id: currentAssignment.id,
          p_current_session: currentSession
        })

      if (!error && data && data.length > 0) {
        // 현재 단어와 다른 단어만 프리페치
        if (data[0].id !== currentWord?.id) {
          prefetchedNextWordRef.current = data[0]
          console.log('🔮 [프리페칭] 다음 단어 준비 완료:', data[0].word_text)
        }
      } else {
        prefetchedNextWordRef.current = null
      }
    } catch (err) {
      console.error('🔮 [프리페칭] 오류:', err)
      prefetchedNextWordRef.current = null
    } finally {
      isPrefetchingRef.current = false
    }
  }

  // ⭐ 현재 단어가 변경되면 다음 단어 프리페칭
  useEffect(() => {
    if (currentWord && student && currentAssignment) {
      // 약간의 딜레이 후 프리페칭 (현재 단어 표시 후)
      const timer = setTimeout(() => {
        prefetchNextWord()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentWord?.id])

  // ⭐ 대상 단어 ID 가져오기 (헬퍼 함수) - 캐싱 적용
  const getTargetWordIds = async (): Promise<number[]> => {
    if (!currentAssignment) return []

    // ⭐ 캐시가 있고, 같은 assignment에 대한 것이면 캐시 반환
    if (
      targetWordIdsRef.current !== null &&
      targetWordIdsAssignmentIdRef.current === currentAssignment.id
    ) {
      return targetWordIdsRef.current
    }

    let result: number[]

    // filtered_word_ids가 있으면 사용, 없으면 wordlist의 실제 단어 ID를 가져옴
    if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
      result = currentAssignment.filtered_word_ids
    } else {
      // 실제 단어 ID를 DB에서 조회
      const { data: words } = await (supabase as any)
        .from('words')
        .select('id')
        .eq('wordlist_id', currentAssignment.wordlist_id)

      result = words?.map((w: any) => w.id) || []
    }

    // ⭐ 캐시에 저장
    targetWordIdsRef.current = result
    targetWordIdsAssignmentIdRef.current = currentAssignment.id

    return result
  }

  // 단어장 완료 체크 (모든 단어가 "안다"가 되었는지)
  const checkWordlistComplete = async (): Promise<boolean> => {
    if (!student || !currentAssignment || !currentWordlist) return false

    const targetWordIds = await getTargetWordIds()
    const totalWords = targetWordIds.length

    // ⭐ 완료된 단어 수 (안다만!)
    const { count: completedCount } = await (supabase as any)
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('status', 'completed')
      .in('word_id', targetWordIds)

    console.log(`🔍 단어장 완료 체크: ${completedCount}/${totalWords}개 안다`)

    // ⭐ 모든 단어가 "안다"가 되어야 완료 (모른다 단어는 회차 반복 학습)
    return (completedCount || 0) >= totalWords
  }

  // Skip한 단어 찾기 (현재 단어장)
  const getSkippedWords = async (): Promise<number[]> => {
    if (!student || !currentAssignment) return []

    // ⭐ 먼저 대상 단어 ID 조회 (해당 단어장의 단어만!)
    const targetWordIds = await getTargetWordIds()
    const targetWordIdSet = new Set(targetWordIds)

    // ⭐ 방법 1: completed_wordlists의 unknown_word_ids 수집
    const { data: completedDays, error: daysError } = await (supabase as any)
      .from('completed_wordlists')
      .select('unknown_word_ids')
      .eq('student_id', student.id)
      .eq('assignment_id', currentAssignment.id)

    if (daysError) {
      console.error('completed_wordlists 조회 실패:', daysError)
    }

    // ⭐ unknown_word_ids에서 해당 단어장의 단어만 필터링 (과거 버그 데이터 제외)
    const unknownFromDaysRaw = completedDays
      ?.flatMap((day: any) => day.unknown_word_ids || []) || []
    const unknownFromDays = unknownFromDaysRaw.filter((id: number) => targetWordIdSet.has(id))

    // ⭐ 방법 2: student_word_progress에서 직접 조회 (실시간 데이터)
    const { data: skippedProgress, error: progressError } = await (supabase as any)
      .from('student_word_progress')
      .select('word_id')
      .eq('student_id', student.id)
      .eq('status', 'skipped')
      .in('word_id', targetWordIds)

    if (progressError) {
      console.error('student_word_progress 조회 실패:', progressError)
      return unknownFromDays  // Fallback
    }

    const unknownFromProgress = skippedProgress?.map((p: any) => p.word_id) || []

    // ⭐ 두 방법 합산 및 중복 제거
    const allUnknownWordIds = [...unknownFromDays, ...unknownFromProgress]
      .filter((id, index, self) => self.indexOf(id) === index)

    console.log(`📚 전체 복습 필요 단어: ${allUnknownWordIds.length}개`)
    console.log(`  - completed_wordlists: ${unknownFromDays.length}개 (필터링 전: ${unknownFromDaysRaw.length}개)`)
    console.log(`  - student_word_progress: ${unknownFromProgress.length}개`)

    return allUnknownWordIds
  }

  // daily_goal 자동 계산
  const calculateDailyGoal = (wordCount: number): number => {
    // ⭐ 최소 5개, 최대 100개 (DB 제약 조건: CHECK (daily_goal BETWEEN 5 AND 100))
    if (wordCount <= 30) return Math.max(5, Math.min(wordCount, 30))  // 5~30개는 단어 수만큼
    if (wordCount <= 100) return 30
    if (wordCount <= 300) return 40
    return 50
  }

  // ⭐ 복습 단어장 자동 생성 (새로운 wordlist 생성)
  const createReviewWordlist = async (skippedWordIds: number[]) => {
    if (!student || !currentAssignment || !currentWordlist) {
      console.warn('⚠️ createReviewWordlist: 필수 데이터 없음')
      return null
    }

    // ⭐ 비동기 작업 시작 시 assignment_id 캡처 (탭 전환 대응)
    const capturedAssignmentId = currentAssignment.id
    const capturedStudentId = student.id

    try {
      console.log(`🔄 복습 단어장 생성 시작 (Skip 단어: ${skippedWordIds.length}개)`)

      // ⭐⭐⭐ 0-1. parent_assignment_id 기반 중복 체크 (가장 정확한 방어)
      const { data: existingReviewAssignment } = await (supabase as any)
        .from('student_wordlists')
        .select('id, wordlist_id')
        .eq('parent_assignment_id', capturedAssignmentId)
        .eq('student_id', capturedStudentId)
        .eq('is_auto_generated', true)
        .maybeSingle()

      if (existingReviewAssignment) {
        console.log(`⚠️ 이 assignment에서 이미 복습 단어장 생성됨 (assignment: ${existingReviewAssignment.id})`)
        console.log('🔒 중복 생성 방지: parent_assignment_id 기반')
        return { wordlist: { id: existingReviewAssignment.wordlist_id }, alreadyExists: true }
      }

      // ⭐⭐⭐ 0-2. 복습 단어장 이름으로 중복 체크 (2중 방어 2단계)
      const reviewWordlistName = `${student.name} - ${currentWordlist.name} 복습 (${skippedWordIds.length}개)`
      const { data: existingWordlist } = await (supabase as any)
        .from('wordlists')
        .select('id, name')
        .eq('name', reviewWordlistName)
        .maybeSingle()

      if (existingWordlist) {
        console.warn(`⚠️ 이미 같은 이름의 복습 단어장이 존재합니다: ${existingWordlist.name}`)
        console.log('🔒 중복 생성 방지: createReviewWordlist에서 차단')
        return { wordlist: existingWordlist, alreadyExists: true }
      }

      // ⭐ 중복 체크 완료 후 assignment 변경 검증
      if (!currentAssignment || currentAssignment.id !== capturedAssignmentId) {
        console.warn('⚠️ [createReviewWordlist] assignment 변경 감지, 생성 중단')
        return null
      }

      // 1. Skip된 단어 정보 가져오기
      const { data: skippedWords, error: wordsError } = await (supabase as any)
        .from('words')
        .select('*')
        .in('id', skippedWordIds)

      if (wordsError) throw wordsError
      if (!skippedWords || skippedWords.length === 0) {
        console.warn('⚠️ Skip된 단어 데이터 없음')
        return null
      }

      // 2. 강사 ID 확인
      const teacherId = currentAssignment.assigned_by
      if (!teacherId) {
        console.warn('⚠️ 강사 ID 없음')
        return null
      }

      // 3. 새 단어장 생성 (복습 단어장 플래그 추가)
      const { data: newWordlist, error: wordlistError } = await (supabase as any)
        .from('wordlists')
        .insert({
          name: reviewWordlistName,
          total_words: skippedWords.length,
          created_by: teacherId,
          created_at: new Date().toISOString(),
          // 복습 단어장 구분 필드
          is_review: true,
          source_wordlist_id: currentWordlist.id,
          created_for_student_id: student.id
        })
        .select()
        .single()

      if (wordlistError) throw wordlistError
      console.log(`✅ 복습 단어장 생성: ${reviewWordlistName} (ID: ${newWordlist.id})`)

      // 4. 새 단어장에 단어 추가
      const newWords = skippedWords.map((word: any, index: number) => ({
        wordlist_id: newWordlist.id,
        word_text: word.word_text,
        meaning: word.meaning,
        example: word.example,
        example_translation: word.example_translation,
        mnemonic: word.mnemonic,
        sequence_order: index + 1
      }))

      const { error: insertWordsError } = await (supabase as any)
        .from('words')
        .insert(newWords)

      if (insertWordsError) throw insertWordsError
      console.log(`✅ ${newWords.length}개 단어 추가 완료`)

      // 5. 복습 단어장은 생성만 하고 배정하지 않음
      // → 강사가 학생 관리 모달에서 명시적으로 배정해야 학생이 학습 가능
      console.log(`📋 복습 단어장 생성 완료 (배정 대기 중 - 강사가 수동 배정 필요)`)

      return {
        wordlist: newWordlist,
        assignment: null,  // 자동 배정하지 않음
        wordCount: skippedWords.length
      }
    } catch (err) {
      console.error('❌ 복습 단어장 생성 실패:', err)
      throw err
    }
  }

  // 완성 단어장 생성
  const createCompletedWordlist = async (completedCount?: number) => {
    if (!student || !currentAssignment) return null

    // ⭐ 비동기 작업 시작 시 assignment_id 캡처 (탭 전환 대응)
    const capturedAssignmentId = currentAssignment.id
    const capturedStudentId = student.id

    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. 회차 번호 먼저 계산 (정확한 값 사용)
      const actualCompleted = completedCount !== undefined ? completedCount : progress.generationCompleted
      // ⭐ 최소 1회차 보장 (0회차 버그 방지)
      const sessionNumber = Math.max(1, Math.ceil(actualCompleted / currentAssignment.session_goal))

      // 2. 이미 생성된 완성 단어장 확인 (중복 방지 - Race Condition 대응)
      const { data: existingCheck } = await (supabase as any)
        .from('completed_wordlists')
        .select('id, word_ids')
        .eq('assignment_id', capturedAssignmentId)
        .eq('session_number', sessionNumber)
        .eq('completed_date', today)
        .maybeSingle()

      if (existingCheck) {
        console.log(`⚠️ ${sessionNumber}회차 완성 단어장이 이미 존재합니다. 기존 것을 사용합니다.`)
        return {
          completedWordlistId: existingCheck.id,
          sessionNumber,
          wordCount: existingCheck.word_ids.length,
          generation: currentAssignment.generation
        }
      }

      // 3. 오늘 이미 생성된 다른 회차 완성 단어장들의 단어 ID 수집
      const { data: existingWordlists } = await (supabase as any)
        .from('completed_wordlists')
        .select('word_ids')
        .eq('student_id', student.id)
        .eq('assignment_id', currentAssignment.id)
        .eq('completed_date', today)

      const existingWordIds = new Set(
        existingWordlists?.flatMap((wl: any) => wl.word_ids) || []
      )

      // ⭐ 대상 단어 ID 결정 (해당 단어장의 단어만 필터링!)
      let targetWordIds: number[] = []
      if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
        // 복습 단어장: filtered_word_ids 사용
        targetWordIds = currentAssignment.filtered_word_ids
      } else {
        // 일반 단어장: words 테이블에서 해당 단어장의 단어 ID 조회
        const { data: wordsData } = await (supabase as any)
          .from('words')
          .select('id')
          .eq('wordlist_id', currentAssignment.wordlist_id)

        targetWordIds = wordsData?.map((w: { id: number }) => w.id) || []
        console.log(`🔵 [createCompletedWordlist] 단어장 ${currentAssignment.wordlist_id}의 단어 ${targetWordIds.length}개로 필터링`)
      }

      // 4-1. 오늘 완료한 단어 (안다)
      let knownQuery = (supabase as any)
        .from('student_word_progress')
        .select('word_id, updated_at')
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .eq('completed_date', today)
        .order('updated_at', { ascending: true })

      // ⭐ 항상 해당 단어장의 단어만 필터링
      if (targetWordIds.length > 0) {
        knownQuery = knownQuery.in('word_id', targetWordIds)
      }

      const { data: knownData, error: knownError } = await knownQuery
      if (knownError) throw knownError

      // 4-2. 현재 회차에서 Skip한 단어 (모른다) - status와 무관하게 last_skipped_session으로 조회
      // ⭐ 마지막 회차에서 skip했다가 "안다"로 바꾼 단어도 포함됨
      let unknownQuery = (supabase as any)
        .from('student_word_progress')
        .select('word_id, updated_at')
        .eq('student_id', student.id)
        .eq('last_skipped_session', currentAssignment.current_session)
        .order('updated_at', { ascending: true })

      // ⭐ 항상 해당 단어장의 단어만 필터링
      if (targetWordIds.length > 0) {
        unknownQuery = unknownQuery.in('word_id', targetWordIds)
      }

      const { data: unknownData, error: unknownError } = await unknownQuery
      if (unknownError) throw unknownError

      // 5. 이미 포함된 단어 제외하고 session_goal 개수만큼
      const wordIds = (knownData?.map((p: any) => p.word_id) || [])
        .filter((id: any) => !existingWordIds.has(id))
        .slice(0, currentAssignment.session_goal)

      // ⭐ 모른다 단어 ID 수집
      const unknownWordIds = (unknownData?.map((p: any) => p.word_id) || [])
        .filter((id: any) => !existingWordIds.has(id))

      // ⭐ 단어가 없으면 null 반환 (이미 모두 포함된 경우)
      if (wordIds.length === 0) {
        console.warn('⚠️ 완료한 단어가 없습니다 (이미 모두 완성 단어장에 포함됨)')
        return null
      }

      // ⭐ 핵심 수정: 단어 수 검증 완화 (1개 이상이면 생성)
      // 목표보다 적어도 경고만 출력하고 계속 진행
      console.log(`📊 ${sessionNumber}회차 완성 단어장 생성`)
      console.log(`  ✅ 안다 (O): ${wordIds.length}/${currentAssignment.session_goal}개`)
      console.log(`  ❌ 모른다 (X): ${unknownWordIds.length}개`)
      
      if (wordIds.length < currentAssignment.session_goal) {
        const shortage = currentAssignment.session_goal - wordIds.length
        console.warn(`⚠️ 목표(${currentAssignment.session_goal}개)보다 ${shortage}개 부족`)
        console.warn(`⚠️ 원인: Skip된 단어 또는 이미 다른 회차에 포함됨`)
        console.warn(`⚠️ → 현재 ${wordIds.length}개로 ${sessionNumber}회차 생성합니다 ✅`)
      }

      // ⭐ insert 직전 assignment 변경 검증 (탭 전환 대응)
      if (!currentAssignment || currentAssignment.id !== capturedAssignmentId) {
        console.warn('⚠️ [createCompletedWordlist] assignment 변경 감지, 생성 중단')
        return null
      }

      // 6. 완성 단어장 생성 (UNIQUE 제약으로 중복 방지)
      const { data: completedWordlist, error: insertError } = await (supabase as any)
        .from('completed_wordlists')
        .insert({
          student_id: capturedStudentId,
          wordlist_id: currentAssignment.base_wordlist_id,
          assignment_id: capturedAssignmentId,
          generation: currentAssignment.generation,
          session_number: sessionNumber,
          word_ids: wordIds,              // ✅ 안다 (O)
          unknown_word_ids: unknownWordIds, // ❌ 모른다 (X) - 신규
          completed_date: today,
          online_test_completed: false
        })
        .select()
        .single()

      if (insertError) {
        // 7. UNIQUE 제약 위반 시 처리 (Race Condition)
        if (insertError.code === '23505') {
          console.warn(`⚠️ ${sessionNumber}회차 완성 단어장이 이미 존재합니다 (Race condition). 기존 것을 조회합니다.`)
          const { data: existing } = await (supabase as any)
            .from('completed_wordlists')
            .select('id, word_ids')
            .eq('assignment_id', capturedAssignmentId)
            .eq('session_number', sessionNumber)
            .eq('completed_date', today)
            .single()

          if (existing) {
            return {
              completedWordlistId: existing.id,
              sessionNumber,
              wordCount: existing.word_ids.length,
              generation: currentAssignment.generation
            }
          }
        }
        throw insertError
      }

      console.log(`✅ ${sessionNumber}회차 (${currentAssignment.generation}차) 완성 단어장 생성 완료`, {
        wordIds,
        count: wordIds.length
      })

      return { 
        completedWordlistId: completedWordlist.id, 
        sessionNumber,
        wordCount: wordIds.length,
        generation: currentAssignment.generation
      }
    } catch (err) {
      console.error('완성 단어장 생성 실패:', err)
      throw err
    }
  }

  // [안다] 버튼 클릭 - ⭐ 낙관적 업데이트 적용
  const handleKnow = async () => {
    if (!currentWord || !student || !currentAssignment || !currentWordlist) return

    // ⭐ 비동기 작업 시작 시 상태 캡처 (탭 전환 대응)
    const capturedAssignmentId = currentAssignment.id
    const capturedStudentId = student.id
    const capturedWordId = currentWord.id
    const capturedWord = currentWord
    const today = new Date().toISOString().split('T')[0]
    const currentSession = progress.session  // ⭐ 현재 회차
    const previousStudied = progress.generationCompleted
    const totalWordCount = currentAssignment.filtered_word_ids?.length || currentWordlist.total_words

    // ========================================
    // 🚀 1단계: 낙관적 UI 업데이트 (즉시 실행)
    // ========================================

    // 1-1. 완료 목록에 즉시 추가
    setCompletedWords(prev => [capturedWord, ...prev])

    // 1-2. 진행률 즉시 업데이트 (로컬 계산)
    const optimisticProgress = calculateProgress(
      progress.generationCompleted + 1,
      0,  // skippedCount - 임시값
      currentAssignment.session_goal,
      totalWordCount
    )
    setProgress(optimisticProgress)

    // 1-3. 프리페치된 단어가 있으면 즉시 표시
    const prefetchedWord = prefetchedNextWordRef.current
    if (prefetchedWord && prefetchedWord.id !== capturedWordId) {
      console.log('🚀 [낙관적 업데이트] 프리페치된 단어 즉시 표시:', prefetchedWord.word_text)
      setCurrentWord(prefetchedWord)
      prefetchedNextWordRef.current = null
    }

    try {
      // ========================================
      // 🔄 2단계: 백그라운드 DB 동기화
      // ========================================

      // 2-1. 진도 업데이트 (DB)
      const { error } = await (supabase as any)
        .from('student_word_progress')
        .upsert({
          student_id: capturedStudentId,
          word_id: capturedWordId,
          status: 'completed',
          last_studied_session: currentSession,  // ⭐ 회차 기록
          completed_date: today,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,word_id'
        })

      if (error) throw error

      // ⭐ DB 업데이트 후 assignment 변경 검증 (탭 전환 대응)
      if (!currentAssignment || currentAssignment.id !== capturedAssignmentId) {
        console.warn('⚠️ [handleKnow] assignment 변경 감지, 상태 업데이트 중단')
        return { goalAchieved: false, aborted: true }
      }

      // 2-2. 서버에서 정확한 진행률 확인 (백그라운드)
      let progressAfterKnow = optimisticProgress
      if (currentAssignment && currentWordlist) {
        progressAfterKnow = await updateProgress(student.id, currentAssignment, currentWordlist)
      }

      const newCompleted = progressAfterKnow.generationCompleted
      const gainedNewStudy = newCompleted > previousStudied

      if (gainedNewStudy) {
        // ⭐⭐⭐ A. 단어장 완료 체크 (최우선 - 마지막 단어 무한로딩 방지!)
        console.log('🟢 [handleKnow] 단어장 완료 체크 시작... newCompleted:', newCompleted)
        const isWordlistComplete = await checkWordlistComplete()
        console.log('🟢 [handleKnow] 단어장 완료 체크 결과:', isWordlistComplete)
        
        if (isWordlistComplete) {
          console.log('🎉 단어장 학습 완료!')

          // ⭐⭐⭐ 조기 잠금: getSkippedWords() 호출 전에 플래그 설정 (Race Condition 방지)
          // fetchNextWord()가 동시에 실행되더라도 복습 생성을 시도하지 않음
          if (isGeneratingReviewRef.current) {
            console.warn('⚠️ [handleKnow] 이미 복습 생성 중... 중복 요청 무시 (조기 잠금)')
            return { goalAchieved: true, generationComplete: true, nextGenerationCreated: false }
          }
          isGeneratingReviewRef.current = true
          setIsGeneratingReview(true)

          try {
            const skippedWords = await getSkippedWords()
            console.log('🟢 [handleKnow] Skip된 단어 개수:', skippedWords.length)

            const totalWordCount = currentAssignment.filtered_word_ids?.length || currentWordlist.total_words
            // ⭐ 단어장 완료 시 최종 진행률 (skippedCount = 0, 모든 단어 완료 가정)
            const finalProgress = calculateProgress(
              totalWordCount,
              0,  // skippedCount - 완료 시점에서는 0
              currentAssignment.session_goal,
              totalWordCount
            )
            setProgress(finalProgress)

            // 마지막 회차 완성 단어장 생성
            const completedData = await createCompletedWordlist(newCompleted)
            console.log('🟢 [handleKnow] 완성 단어장 생성 완료:', completedData)

            // ⭐⭐⭐ 중요: 단어장 완료 시 현재 단어를 null로 설정하여 무한 루프 방지
            console.log('🟢 [handleKnow] setCurrentWord(null) 호출 - 무한 루프 방지!')
            setCurrentWord(null)

            if (skippedWords.length > 0) {
              // ⭐ 복습 단어장 자동 생성 (새로운 wordlist 생성)
              const reviewResult = await createReviewWordlist(skippedWords)

              if (reviewResult) {
                console.log(`🎉 복습 단어장 생성 완료: ${reviewResult.wordlist.name}`)
                console.log(`📚 강사 대시보드에서 확인 가능`)
              }

              return {
                goalAchieved: true,
                completedWordlistData: completedData,
                generationComplete: true,
                nextGenerationCreated: true,
                skippedCount: skippedWords.length,
                reviewWordlist: reviewResult?.wordlist  // 복습 단어장 정보
              }
            } else {
              // 완벽 암기!
              return {
                goalAchieved: true,
                completedWordlistData: completedData,
                generationComplete: true,
                nextGenerationCreated: false,
                perfectCompletion: true
              }
            }
          } finally {
            // ⭐⭐⭐ 잠금 해제 (항상 실행)
            isGeneratingReviewRef.current = false
            setIsGeneratingReview(false)
          }
        }

        // B. ⭐ 회차 목표 달성 체크 (개선 버전)
        // 1) 현재 회차에서 skip한 개수 조회
        const targetWordIds = await getTargetWordIds()
        const { count: skippedInSessionCount } = await (supabase as any)
          .from('student_word_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .eq('status', 'skipped')
          .eq('last_studied_session', currentAssignment.current_session)
          .in('word_id', targetWordIds)

        // 2) 다음 단어가 있는지 미리 체크
        const { data: nextWordCheck } = await (supabase as any)
          .rpc('get_next_word', {
            p_student_id: student.id,
            p_assignment_id: currentAssignment.id,
            p_current_session: currentAssignment.current_session
          })

        const hasMoreWords = nextWordCheck && nextWordCheck.length > 0
        const skippedInSession = skippedInSessionCount || 0

        console.log(`📊 회차 완료 체크: 안다=${progressAfterKnow.today}, 모른다=${skippedInSession}, 더있음=${hasMoreWords}`)

        if (isSessionComplete(progressAfterKnow.today, skippedInSession, currentAssignment.session_goal, hasMoreWords)) {
          const totalStudiedInSession = progressAfterKnow.today + skippedInSession
          console.log(`🎯 ${currentAssignment.current_session}회차 완료! (안다 ${progressAfterKnow.today}개, 모른다 ${skippedInSession}개, 총 ${totalStudiedInSession}개)`)

          // 완성 단어장 생성
          const completedData = await createCompletedWordlist(newCompleted)

          if (!completedData) {
            console.error('❌ 완성 단어장 생성 실패')
            await fetchNextWord()
            return { goalAchieved: false }
          }

          // ⭐ DB에서 회차 번호 증가
          const { error: updateError } = await (supabase as any)
            .from('student_wordlists')
            .update({ current_session: currentAssignment.current_session + 1 })
            .eq('id', currentAssignment.id)

          if (updateError) {
            console.error('❌ 회차 번호 업데이트 실패:', updateError)
          } else {
            console.log(`✅ 다음 회차로 진행: ${currentAssignment.current_session + 1}회차`)
            // 로컬 상태도 업데이트
            setCurrentAssignment({
              ...currentAssignment,
              current_session: currentAssignment.current_session + 1
            })
          }

          // 다음 회차 첫 단어 로드
          await fetchNextWord(true)

          return {
            goalAchieved: true,
            completedWordlistData: completedData,
            generationComplete: false,
            skippedCount: skippedInSession  // skip 개수 반환
          }
        }
      }

      // C. 일반 단어 완료 - 프리페치된 단어가 없으면 다음 단어 로드
      if (!prefetchedWord || prefetchedWord.id === capturedWordId) {
        console.log('🔄 [handleKnow] 프리페치 없음, fetchNextWord() 호출')
        await fetchNextWord()
      } else {
        console.log('✅ [handleKnow] 프리페치된 단어로 이미 전환됨')
      }

      return { goalAchieved: false }
    } catch (err) {
      console.error('단어 완료 처리 실패:', err)
      // ⭐ 에러 시 롤백: 이전 상태로 복원
      console.warn('⚠️ [handleKnow] DB 오류로 UI 롤백')
      setCompletedWords(prev => prev.filter(w => w.id !== capturedWordId))
      throw err
    }
  }

  // [모른다] 버튼 클릭
  const handleDontKnow = async () => {
    if (!currentWord || !student) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const currentSession = progress.session  // ⭐ 현재 회차

      // skip_count 증가
      const { data: existingProgress } = await (supabase as any)
        .from('student_word_progress')
        .select('*')  // ⭐ skip_count 대신 * 사용 (406 에러 방지)
        .eq('student_id', student.id)
        .eq('word_id', currentWord.id)
        .maybeSingle()  // ⭐ single() → maybeSingle() (데이터 없을 수 있음)

      const currentSkipCount = existingProgress?.skip_count || 0
      const newSkipCount = currentSkipCount + 1

      // ⭐ Skip 전략: 다음 회차에 재등장 (회차 기반)
      const appearStrategy = 'next_session'
      
      console.log(`❌ ${currentWord.word_text}: ${newSkipCount}회 Skip (${currentSession}회차) → 다음 회차에 우선 등장`)

      await (supabase as any)
        .from('student_word_progress')
        .upsert({
          student_id: student.id,
          word_id: currentWord.id,
          status: 'skipped',
          skip_count: newSkipCount,
          last_studied_session: currentSession,  // ⭐ 회차 기록
          last_skipped_session: currentSession,  // ⭐ skip한 회차 기록 (X-TEST용)
          next_appear_date: null,  // ⭐ 기록용 (로직에는 사용 안 함)
          completed_date: today,  // ⭐ 기록용
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,word_id'
        })

      if (currentAssignment && currentWordlist) {
        await updateProgress(student.id, currentAssignment, currentWordlist)
      }

      return {
        skipCount: newSkipCount,
        word: currentWord,
        appearStrategy
      }
    } catch (err) {
      console.error('Skip 처리 실패:', err)
      throw err
    }
  }

  // Skip 확정
  const confirmSkip = async () => {
    await fetchNextWord()
  }

  return {
    student,
    currentAssignment,
    currentWordlist,
    currentWord,
    completedWords,
    progress,
    pendingTest,
    loading,
    error,
    handleKnow,
    handleDontKnow,
    confirmSkip,
    fetchNextWord,
    showGenerationCompleteModal,
    setShowGenerationCompleteModal,
    generationModalData,
    setGenerationModalData
  }
}
