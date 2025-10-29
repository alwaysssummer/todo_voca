'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Word } from '@/types/word'

// ===================================================================
// 순수 함수들 (유틸리티)
// ===================================================================

/**
 * 진행률 계산 (순수 함수)
 * @param completedCount - 완료한 단어 개수
 * @param sessionGoal - 회차당 목표 단어 개수
 * @param totalWords - 세대 전체 단어 개수
 * @returns 계산된 진행률 정보
 */
function calculateProgress(
  completedCount: number,
  sessionGoal: number,
  totalWords: number
): {
  today: number
  todayGoal: number
  generationCompleted: number
  generationTotal: number
  session: number
} {
  const todayProgress = completedCount % sessionGoal
  
  let currentSession: number
  if (completedCount === 0) {
    currentSession = 1  // 시작
  } else if (todayProgress === 0) {
    // 배수 완료 = 이전 회차 완료 → 다음 회차 시작
    currentSession = (completedCount / sessionGoal) + 1
  } else {
    // 진행 중
    currentSession = Math.ceil(completedCount / sessionGoal)
  }
  
  return {
    today: todayProgress,
    todayGoal: sessionGoal,
    generationCompleted: completedCount,
    generationTotal: totalWords,
    session: currentSession
  }
}

/**
 * 회차 완료 체크 (순수 함수)
 * @param completedCount - 완료한 단어 개수
 * @param sessionGoal - 회차당 목표 단어 개수
 * @returns 회차 완료 여부
 */
function isSessionComplete(completedCount: number, sessionGoal: number): boolean {
  return completedCount > 0 && (completedCount % sessionGoal === 0)
}

// ===================================================================
// 타입 정의
// ===================================================================

interface Student {
  id: string
  name: string
  session_goal: number  // 회차당 목표
}

interface Assignment {
  id: string
  wordlist_id: string
  base_wordlist_id: string
  generation: number
  parent_assignment_id: string | null
  filtered_word_ids: number[] | null
  is_auto_generated: boolean
  session_goal: number  // 회차당 목표
  assigned_by: string  // 강사 ID
}

interface Wordlist {
  id: string
  name: string
  total_words: number
}

interface Progress {
  today: number
  todayGoal: number
  generationCompleted: number
  generationTotal: number
  session: number  // 현재 회차
}

interface PendingTest {
  hasPendingTest: boolean
  pendingTestId: string | null
}

export function useStudySession(token: string) {
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
  const [showGenerationCompleteModal, setShowGenerationCompleteModal] = useState(false)  // ⭐ 세대 완료 모달
  const [generationModalData, setGenerationModalData] = useState<any>(null)  // ⭐ 세대 완료 모달 데이터
  const isGeneratingReviewRef = useRef(false)  // ⭐ useRef로 즉시 중복 방지

  // 학생 정보 및 현재 활성 assignment 가져오기
  useEffect(() => {
    async function fetchStudentAndAssignment() {
      try {
        // 1. 학생 정보 가져오기
        const { data: studentData, error: studentError } = await supabase
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

        // 2. 현재 활성 assignment 가져오기 (최고 세대)
        const { data: assignments, error: assignmentError } = await supabase
          .from('student_wordlists')
          .select('id, wordlist_id, base_wordlist_id, generation, parent_assignment_id, filtered_word_ids, is_auto_generated, daily_goal, assigned_by')
          .eq('student_id', studentData.id)
          .order('generation', { ascending: false })
          .order('assigned_at', { ascending: false })

        if (assignmentError) throw assignmentError
        if (!assignments || assignments.length === 0) {
          throw new Error('배정된 단어장이 없습니다')
        }

        // daily_goal을 session_goal로 매핑
        const rawAssignment = assignments[0]
        const assignment: Assignment = {
          ...rawAssignment,
          session_goal: rawAssignment.daily_goal,
          assigned_by: rawAssignment.assigned_by || ''
        }
        setCurrentAssignment(assignment)

        // 3. Wordlist 정보 가져오기
        const { data: wordlistData, error: wordlistError } = await supabase
          .from('wordlists')
          .select('id, name, total_words')
          .eq('id', assignment.wordlist_id)
          .single()

        if (wordlistError) throw wordlistError
        setCurrentWordlist(wordlistData)

        // 4. 진행률 계산
        await updateProgress(studentData.id, assignment, wordlistData)

        setLoading(false)
      } catch (err: any) {
        console.error('초기 로드 오류:', err)
        setError(err.message || '데이터를 불러올 수 없습니다')
        setLoading(false)
      }
    }

    fetchStudentAndAssignment()
  }, [token])

  // 초기 로딩 완료 후 첫 단어 가져오기
  useEffect(() => {
    if (!loading && student && currentAssignment && !currentWord && !error && !isGeneratingReview) {
      fetchNextWord()
    }
  }, [loading, student, currentAssignment, isGeneratingReview])  // ⭐ isGeneratingReview 의존성 추가

  // 진행률 업데이트 함수
  const updateProgress = async (studentId: string, assignment: Assignment, wordlist: Wordlist) => {
    // A. 세대 전체 완료 개수
    let generationQuery = supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'completed')

    if (assignment.filtered_word_ids && assignment.filtered_word_ids.length > 0) {
      generationQuery = generationQuery.in('word_id', assignment.filtered_word_ids)
    }

    const { count: generationCompletedCount } = await generationQuery

    // B. 세대 전체 단어 수
    const generationTotal = assignment.filtered_word_ids?.length || wordlist.total_words

    // C. 현재 회차 및 회차 내 진행률 계산
    const completed = generationCompletedCount || 0
    const todayProgress = completed % assignment.session_goal
    
    // ⭐ 회차 계산 수정: 배수 완료 시 다음 회차로
    // todayProgress === 0이면 이전 회차 완료 → 다음 회차 시작
    let currentSession: number
    if (completed === 0) {
      currentSession = 1  // 첫 시작
    } else if (todayProgress === 0) {
      currentSession = (completed / assignment.session_goal) + 1  // 배수 완료 → 다음 회차
    } else {
      currentSession = Math.ceil(completed / assignment.session_goal)  // 진행 중
    }

    const newProgress = {
      today: todayProgress,  // 현재 회차 내 진행률
      todayGoal: assignment.session_goal,
      generationCompleted: completed,
      generationTotal: generationTotal,
      session: currentSession
    }

    setProgress(newProgress)

    // D. 평가 대기 체크
    const { data: pendingTestData } = await supabase
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

    // ⭐ 계산된 진행률 반환 (forceRefresh 시 사용)
    return newProgress
  }

  // 다음 단어 가져오기
  const fetchNextWord = async (forceRefresh = false) => {
    if (!student || !currentAssignment) return

    // ⭐ forceRefresh: 회차 완료 후 진행률을 먼저 새로고침
    if (forceRefresh && currentWordlist) {
      const refreshedProgress = await updateProgress(student.id, currentAssignment, currentWordlist)
      console.log('📊 진행률 새로고침:', refreshedProgress)
    }

    try {
      const currentSession = progress.session  // ⭐ 현재 회차
      
      console.log('🔍 get_next_word 호출:', {
        student_id: student.id,
        assignment_id: currentAssignment.id,
        current_session: currentSession  // ⭐ 회차 전달
      })

      const { data, error} = await supabase
        .rpc('get_next_word', {
          p_student_id: student.id,
          p_assignment_id: currentAssignment.id,
          p_current_session: currentSession  // ⭐ 회차 전달
        })

      if (error) {
        console.error('❌ RPC 오류:', error)
        throw error
      }
      
      if (data && data.length > 0) {
        console.log('✅ 다음 단어 로드:', data[0].word_text, '(sequence:', data[0].sequence_order + ')')
        setCurrentWord(data[0])
      } else {
        console.log('ℹ️ 더 이상 학습할 단어가 없습니다')
        setCurrentWord(null)
        
        // ⭐ 단어가 없을 때 세대 완료 체크
        if (currentWordlist) {
          const isComplete = await checkGenerationComplete()
          if (isComplete) {
            console.log('🎉 세대 완료 감지!')
            
            // ⭐⭐⭐ 복습 단어장 생성 로직 실행
            const skippedWords = await getSkippedWordsInGeneration()
            
            if (skippedWords.length > 0 && !isGeneratingReview && !isGeneratingReviewRef.current) {
              // ⭐ useRef로 즉시 중복 방지
              isGeneratingReviewRef.current = true
              setIsGeneratingReview(true)
              
              // ⭐ DB에서 이미 복습 단어장이 생성되었는지 확인
              const teacherId = currentAssignment.assigned_by
              const { data: existingReview } = await supabase
                .from('wordlists')
                .select('id')
                .eq('created_by', teacherId)
                .ilike('name', `%${student.name}%${currentWordlist.name} 복습%`)
                .limit(1)
                .maybeSingle()
              
              if (existingReview) {
                console.log('⚠️ 복습 단어장이 이미 존재합니다. 중복 생성을 방지합니다.')
                setIsGeneratingReview(false)
                return
              }
              
              try {
                const reviewResult = await createReviewWordlist(skippedWords)
                
                if (reviewResult) {
                  console.log(`🎉 복습 단어장 생성 완료: ${reviewResult.wordlist.name}`)
                  console.log(`📚 강사 대시보드에서 확인 가능`)
                  
                  // ⭐ 세대 완료 모달 데이터 설정
                  setGenerationModalData({
                    currentGeneration: currentAssignment?.generation || 1,
                    skippedCount: skippedWords.length,
                    nextGenerationCreated: true,
                    perfectCompletion: false
                  })
                  
                  // ⭐ 세대 완료 모달 표시
                  setShowGenerationCompleteModal(true)
                }
              } catch (err) {
                console.error('❌ 복습 단어장 생성 실패:', err)
              } finally {
                setIsGeneratingReview(false)
              }
              return  // ⭐ 무한 루프 방지
            } else if (skippedWords.length === 0) {
              console.log('🎊 완벽 암기! Skip 단어 없음')
              
              // ⭐ 세대 완료 모달 데이터 설정 (완벽 암기)
              setGenerationModalData({
                currentGeneration: currentAssignment?.generation || 1,
                skippedCount: 0,
                nextGenerationCreated: false,
                perfectCompletion: true
              })
              
              // ⭐ 세대 완료 모달 표시
              setShowGenerationCompleteModal(true)
              return  // ⭐ 무한 루프 방지
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
      const { data: todayCompletedWordlists } = await supabase
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
      const allWordIds = todayCompletedWordlists.flatMap(wl => wl.word_ids)

      if (allWordIds.length === 0) {
        setCompletedWords([])
        return
      }

      // 3. 단어 정보 조회
      const { data: wordsData, error } = await supabase
        .from('words')
        .select('id, word_text, meaning, wordlist_id')
        .in('id', allWordIds)

      if (error) throw error

      // 4. word_ids 순서대로 정렬 (완료 순서 유지)
      const orderedWords = allWordIds
        .map(id => wordsData?.find(w => w.id === id))
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

  // ⭐ 대상 단어 ID 가져오기 (헬퍼 함수)
  const getTargetWordIds = async (): Promise<number[]> => {
    if (!currentAssignment) return []

    // filtered_word_ids가 있으면 사용, 없으면 wordlist의 실제 단어 ID를 가져옴
    if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
      return currentAssignment.filtered_word_ids
    } else {
      // 실제 단어 ID를 DB에서 조회
      const { data: words } = await supabase
        .from('words')
        .select('id')
        .eq('wordlist_id', currentAssignment.wordlist_id)
      
      return words?.map(w => w.id) || []
    }
  }

  // 세대 완료 체크
  const checkGenerationComplete = async (): Promise<boolean> => {
    if (!student || !currentAssignment || !currentWordlist) return false

    const targetWordIds = await getTargetWordIds()
    const totalWords = targetWordIds.length

    // ⭐ 1. 완료된 단어 수
    const { count: completedCount } = await supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('status', 'completed')
      .in('word_id', targetWordIds)

    // ⭐ 2. Skip된 단어 수
    const { count: skippedCount } = await supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('status', 'skipped')
      .in('word_id', targetWordIds)

    // ⭐ 3. 전체 학습한 단어 = completed + skipped
    const studiedCount = (completedCount || 0) + (skippedCount || 0)

    console.log(`🔍 세대 완료 체크: ${studiedCount}/${totalWords}개 학습 완료 (O:${completedCount}, X:${skippedCount})`)

    // ⭐ 모든 단어를 학습했으면 완료
    return studiedCount >= totalWords
  }

  // Skip한 단어 찾기 (현재 세대)
  const getSkippedWordsInGeneration = async (): Promise<number[]> => {
    if (!student || !currentAssignment) return []

    // ⭐ 방법 1: completed_wordlists의 unknown_word_ids 수집
    const { data: completedDays, error: daysError } = await supabase
      .from('completed_wordlists')
      .select('unknown_word_ids')
      .eq('student_id', student.id)
      .eq('assignment_id', currentAssignment.id)

    if (daysError) {
      console.error('completed_wordlists 조회 실패:', daysError)
    }

    const unknownFromDays = completedDays
      ?.flatMap(day => day.unknown_word_ids || []) || []

    // ⭐ 방법 2: student_word_progress에서 직접 조회 (실시간 데이터)
    const targetWordIds = await getTargetWordIds()
    
    const { data: skippedProgress, error: progressError } = await supabase
      .from('student_word_progress')
      .select('word_id')
      .eq('student_id', student.id)
      .eq('status', 'skipped')
      .in('word_id', targetWordIds)

    if (progressError) {
      console.error('student_word_progress 조회 실패:', progressError)
      return unknownFromDays  // Fallback
    }

    const unknownFromProgress = skippedProgress?.map(p => p.word_id) || []

    // ⭐ 두 방법 합산 및 중복 제거
    const allUnknownWordIds = [...unknownFromDays, ...unknownFromProgress]
      .filter((id, index, self) => self.indexOf(id) === index)

    console.log(`📚 전체 복습 필요 단어: ${allUnknownWordIds.length}개`)
    console.log(`  - completed_wordlists: ${unknownFromDays.length}개`)
    console.log(`  - student_word_progress: ${unknownFromProgress.length}개`)

    return allUnknownWordIds
  }

  // daily_goal 자동 계산
  const calculateDailyGoal = (wordCount: number): number => {
    // ⭐ 최소 20개, 최대 100개 (DB 제약 조건: CHECK (daily_goal BETWEEN 20 AND 100))
    if (wordCount <= 20) return 20  // 최소값 보장
    if (wordCount <= 30) return Math.min(wordCount, 30)
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

    try {
      console.log(`🔄 복습 단어장 생성 시작 (Skip 단어: ${skippedWordIds.length}개)`)
      
      // ⭐ 0. 이미 생성된 복습 단어장이 있는지 확인 (중복 방지)
      const reviewWordlistName = `${student.name} - ${currentWordlist.name} 복습 (${skippedWordIds.length}개)`
      const { data: existingWordlist } = await supabase
        .from('wordlists')
        .select('id, name')
        .eq('name', reviewWordlistName)
        .maybeSingle()
      
      if (existingWordlist) {
        console.warn(`⚠️ 이미 생성된 복습 단어장: ${existingWordlist.name}`)
        return { wordlist: existingWordlist, alreadyExists: true }
      }
      
      // 1. Skip된 단어 정보 가져오기
      const { data: skippedWords, error: wordsError } = await supabase
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

      // 3. 새 단어장 생성 (이름 재사용)
      const { data: newWordlist, error: wordlistError } = await supabase
        .from('wordlists')
        .insert({
          name: reviewWordlistName,
          total_words: skippedWords.length,
          created_by: teacherId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (wordlistError) throw wordlistError
      console.log(`✅ 새 단어장 생성: ${reviewWordlistName} (ID: ${newWordlist.id})`)

      // 4. 새 단어장에 단어 추가
      const newWords = skippedWords.map((word, index) => ({
        wordlist_id: newWordlist.id,
        word_text: word.word_text,
        meaning: word.meaning,
        example: word.example,
        example_translation: word.example_translation,
        mnemonic: word.mnemonic,
        sequence_order: index + 1
      }))

      const { error: insertWordsError } = await supabase
        .from('words')
        .insert(newWords)
      
      if (insertWordsError) throw insertWordsError
      console.log(`✅ ${newWords.length}개 단어 추가 완료`)

      // 5. 학생에게 자동 배정
      const suggestedDailyGoal = calculateDailyGoal(skippedWords.length)
      const { data: newAssignment, error: assignError } = await supabase
        .from('student_wordlists')
        .insert({
          student_id: student.id,
          wordlist_id: newWordlist.id,
          base_wordlist_id: newWordlist.id,  // ⭐ 새 단어장이 base가 됨
          generation: 1,  // 1세대로 시작
          parent_assignment_id: null,  // 독립적인 단어장
          filtered_word_ids: null,  // 전체 단어 학습
          daily_goal: suggestedDailyGoal,
          is_auto_generated: true,
          assigned_by: teacherId,
          assigned_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (assignError) throw assignError
      console.log(`✅ 복습 단어장 자동 배정 완료 (일일 목표: ${suggestedDailyGoal}개)`)

      return {
        wordlist: newWordlist,
        assignment: newAssignment,
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

    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. 회차 번호 먼저 계산 (정확한 값 사용)
      const actualCompleted = completedCount !== undefined ? completedCount : progress.generationCompleted
      const sessionNumber = Math.ceil(actualCompleted / currentAssignment.session_goal)

      // 2. 이미 생성된 완성 단어장 확인 (중복 방지 - Race Condition 대응)
      const { data: existingCheck } = await supabase
        .from('completed_wordlists')
        .select('id, word_ids')
        .eq('assignment_id', currentAssignment.id)
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
      const { data: existingWordlists } = await supabase
        .from('completed_wordlists')
        .select('word_ids')
        .eq('student_id', student.id)
        .eq('assignment_id', currentAssignment.id)
        .eq('completed_date', today)

      const existingWordIds = new Set(
        existingWordlists?.flatMap(wl => wl.word_ids) || []
      )

      // 4-1. 오늘 완료한 단어 (안다)
      let knownQuery = supabase
        .from('student_word_progress')
        .select('word_id, updated_at')
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .eq('completed_date', today)
        .order('updated_at', { ascending: true })

      if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
        knownQuery = knownQuery.in('word_id', currentAssignment.filtered_word_ids)
      }

      const { data: knownData, error: knownError } = await knownQuery
      if (knownError) throw knownError

      // 4-2. 오늘 Skip한 단어 (모른다)
      let unknownQuery = supabase
        .from('student_word_progress')
        .select('word_id, updated_at')
        .eq('student_id', student.id)
        .eq('status', 'skipped')
        .eq('completed_date', today)
        .order('updated_at', { ascending: true })

      if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
        unknownQuery = unknownQuery.in('word_id', currentAssignment.filtered_word_ids)
      }

      const { data: unknownData, error: unknownError } = await unknownQuery
      if (unknownError) throw unknownError

      // 5. 이미 포함된 단어 제외하고 session_goal 개수만큼
      const wordIds = (knownData?.map(p => p.word_id) || [])
        .filter(id => !existingWordIds.has(id))
        .slice(0, currentAssignment.session_goal)
      
      // ⭐ 모른다 단어 ID 수집
      const unknownWordIds = (unknownData?.map(p => p.word_id) || [])
        .filter(id => !existingWordIds.has(id))

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

      // 6. 완성 단어장 생성 (UNIQUE 제약으로 중복 방지)
      const { data: completedWordlist, error: insertError } = await supabase
        .from('completed_wordlists')
        .insert({
          student_id: student.id,
          wordlist_id: currentAssignment.base_wordlist_id,
          assignment_id: currentAssignment.id,
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
          const { data: existing } = await supabase
            .from('completed_wordlists')
            .select('id, word_ids')
            .eq('assignment_id', currentAssignment.id)
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

  // [안다] 버튼 클릭
  const handleKnow = async () => {
    if (!currentWord || !student || !currentAssignment || !currentWordlist) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const currentSession = progress.session  // ⭐ 현재 회차

      // 진도 업데이트
      const { error } = await supabase
        .from('student_word_progress')
        .upsert({
          student_id: student.id,
          word_id: currentWord.id,
          status: 'completed',
          last_studied_session: currentSession,  // ⭐ 회차 기록
          completed_date: today,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,word_id'
        })

      if (error) throw error

      // 완료 목록에 추가
      setCompletedWords([currentWord, ...completedWords])
      
      // ⭐ 진행률 계산 (순수 함수 사용으로 단순화)
      const newCompleted = progress.generationCompleted + 1
      const newProgress = calculateProgress(
        newCompleted,
        currentAssignment.session_goal,
        currentAssignment.filtered_word_ids?.length || currentWordlist.total_words
      )
      
      setProgress(newProgress)

      // ⭐⭐⭐ A. 세대 완료 체크 (최우선 - 100번째 단어 무한로딩 방지!)
      const isGenerationComplete = await checkGenerationComplete()
      
      if (isGenerationComplete) {
        console.log('🎉 세대 완료!')
        const skippedWords = await getSkippedWordsInGeneration()
        
        // 마지막 회차 완성 단어장 생성
        const completedData = await createCompletedWordlist(newCompleted)
        
        if (skippedWords.length > 0) {
          // ⭐ 중복 방지: 이미 생성 중이면 skip
          if (isGeneratingReview) {
            console.warn('⚠️ 복습 단어장 생성 중... 중복 요청 무시')
            return { 
              goalAchieved: true,
              completedWordlistData: completedData,
              generationComplete: true,
              nextGenerationCreated: false,
              skippedCount: skippedWords.length
            }
          }

          setIsGeneratingReview(true)
          
          try {
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
          } finally {
            setIsGeneratingReview(false)
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
      }

      // B. 회차 목표 달성 체크 (순수 함수 사용)
      if (isSessionComplete(newCompleted, currentAssignment.session_goal)) {
        console.log(`🎯 ${newProgress.session - 1}회차 완료! (${newCompleted}개)`)
        
        // 완성 단어장 생성 (정확한 completed 값 전달)
        const completedData = await createCompletedWordlist(newCompleted)
        
        // completedData가 null이면 에러 처리 (Skip된 단어로 인한 부족)
        if (!completedData) {
          console.error('❌ 완성 단어장 생성 실패 - Skip된 단어가 있을 가능성')
          console.warn('⚠️ 회차 완료 처리를 건너뛰고 다음 단어를 계속 학습합니다')
          // 회차 완료 처리 안 하고 다음 단어 로드
          await fetchNextWord()
          return { goalAchieved: false }
        }
        
        // 회차 목표만 달성 - 다음 회차 첫 단어 로드
        await fetchNextWord(true)  // ⭐ forceRefresh로 진행률 갱신 후 다음 단어 로드
        
        return { 
          goalAchieved: true,
          completedWordlistData: completedData,
          generationComplete: false
        }
      }

      // C. 일반 단어 완료 - 다음 단어 로드
      await fetchNextWord()
      
      return { goalAchieved: false }
    } catch (err) {
      console.error('단어 완료 처리 실패:', err)
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
      const { data: existingProgress } = await supabase
        .from('student_word_progress')
        .select('skip_count')
        .eq('student_id', student.id)
        .eq('word_id', currentWord.id)
        .single()

      const currentSkipCount = existingProgress?.skip_count || 0
      const newSkipCount = currentSkipCount + 1

      // ⭐ Skip 전략: 다음 회차에 재등장 (회차 기반)
      const appearStrategy = 'next_session'
      
      console.log(`❌ ${currentWord.word_text}: ${newSkipCount}회 Skip (${currentSession}회차) → 다음 회차에 우선 등장`)

      await supabase
        .from('student_word_progress')
        .upsert({
          student_id: student.id,
          word_id: currentWord.id,
          status: 'skipped',
          skip_count: newSkipCount,
          last_studied_session: currentSession,  // ⭐ 회차 기록
          next_appear_date: null,  // ⭐ 기록용 (로직에는 사용 안 함)
          completed_date: today,  // ⭐ 기록용
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,word_id'
        })

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
