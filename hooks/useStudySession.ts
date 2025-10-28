'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Word } from '@/types/word'

interface Student {
  id: string
  name: string
  daily_goal: number
}

interface Assignment {
  id: string
  wordlist_id: string
  base_wordlist_id: string
  generation: number
  parent_assignment_id: string | null
  filtered_word_ids: number[] | null
  is_auto_generated: boolean
  daily_goal: number
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
  day: number
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
    day: 1 
  })
  const [pendingTest, setPendingTest] = useState<PendingTest>({
    hasPendingTest: false,
    pendingTestId: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        
        setStudent(studentData)

        // 2. 현재 활성 assignment 가져오기 (최고 세대)
        const { data: assignments, error: assignmentError } = await supabase
          .from('student_wordlists')
          .select('id, wordlist_id, base_wordlist_id, generation, parent_assignment_id, filtered_word_ids, is_auto_generated, daily_goal')
          .eq('student_id', studentData.id)
          .order('generation', { ascending: false })
          .order('assigned_at', { ascending: false })

        if (assignmentError) throw assignmentError
        if (!assignments || assignments.length === 0) {
          throw new Error('배정된 단어장이 없습니다')
        }

        const assignment = assignments[0] as Assignment
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
    if (!loading && student && currentAssignment && !currentWord && !error) {
      fetchNextWord()
    }
  }, [loading, student, currentAssignment])

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

    // C. 현재 Day 및 Day 내 진행률 계산
    const completed = generationCompletedCount || 0
    // ⭐ Day 계산 통일: Math.ceil 사용 (0개일 때는 Day 1)
    const currentDay = completed === 0 ? 1 : Math.ceil(completed / assignment.daily_goal)
    const todayProgress = completed % assignment.daily_goal

    setProgress({
      today: todayProgress,  // 현재 Day 내 진행률 (0~49)
      todayGoal: assignment.daily_goal,
      generationCompleted: completed,
      generationTotal: generationTotal,
      day: currentDay
    })

    // D. 평가 대기 체크
    const { data: pendingTestData } = await supabase
      .from('completed_wordlists')
      .select('id')
      .eq('student_id', studentId)
      .eq('online_test_completed', false)
      .order('day_number', { ascending: true })
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
  }

  // 다음 단어 가져오기
  const fetchNextWord = async (forceRefresh = false) => {
    if (!student || !currentAssignment) return

    // ⭐ forceRefresh: Day 완료 후 진행률을 먼저 새로고침
    if (forceRefresh && currentWordlist) {
      await updateProgress(student.id, currentAssignment, currentWordlist)
    }

    // ⭐ 핵심 안정성 개선: Day별 학습 제어
    // 오늘의 목표를 달성했으면 더 이상 단어를 제공하지 않음
    if (progress.today >= progress.todayGoal) {
      console.log(`Day ${progress.day} 완료: ${progress.today}/${progress.todayGoal}`)
      setCurrentWord(null)
      return
    }

    try {
      const { data, error } = await supabase
        .rpc('get_next_word', {
          p_student_id: student.id,
          p_assignment_id: currentAssignment.id
        })

      if (error) throw error
      
      if (data && data.length > 0) {
        setCurrentWord(data[0])
      } else {
        setCurrentWord(null)
      }
    } catch (err) {
      console.error('다음 단어 로드 실패:', err)
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
        .order('day_number', { ascending: true })

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

  // 세대 완료 체크
  const checkGenerationComplete = async (): Promise<boolean> => {
    if (!student || !currentAssignment || !currentWordlist) return false

    const totalWords = currentAssignment.filtered_word_ids?.length || currentWordlist.total_words

    const { count } = await supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('status', 'completed')
      .in('word_id', currentAssignment.filtered_word_ids || Array.from({ length: currentWordlist.total_words }, (_, i) => i + 1))

    return (count || 0) >= totalWords
  }

  // Skip한 단어 찾기 (현재 세대)
  const getSkippedWordsInGeneration = async (): Promise<number[]> => {
    if (!student || !currentAssignment) return []

    const { data, error } = await supabase
      .from('student_word_progress')
      .select('word_id')
      .eq('student_id', student.id)
      .gt('skip_count', 0)

    if (error) {
      console.error('Skip 단어 조회 실패:', err)
      return []
    }

    let skippedWordIds = data?.map(w => w.word_id) || []

    // 현재 세대의 단어만 필터링
    if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
      skippedWordIds = skippedWordIds.filter(id => currentAssignment.filtered_word_ids!.includes(id))
    }

    return skippedWordIds
  }

  // daily_goal 자동 계산
  const calculateDailyGoal = (wordCount: number): number => {
    if (wordCount <= 30) return Math.min(wordCount, 30)
    if (wordCount <= 100) return 30
    if (wordCount <= 300) return 40
    return 50
  }

  // 다음 세대 생성
  const createNextGeneration = async (skippedWordIds: number[]) => {
    if (!student || !currentAssignment || !currentWordlist) return null

    try {
      const nextGeneration = currentAssignment.generation + 1
      const suggestedDailyGoal = calculateDailyGoal(skippedWordIds.length)

      console.log(`🔄 ${nextGeneration}차 단어장 생성 중... (${skippedWordIds.length}개 단어, 목표: ${suggestedDailyGoal}개)`)

      const { data: newAssignment, error: insertError } = await supabase
        .from('student_wordlists')
        .insert({
          student_id: student.id,
          wordlist_id: currentAssignment.wordlist_id,
          base_wordlist_id: currentAssignment.base_wordlist_id,
          generation: nextGeneration,
          parent_assignment_id: currentAssignment.id,
          filtered_word_ids: skippedWordIds,
          daily_goal: suggestedDailyGoal,
          is_auto_generated: true,
          assigned_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      console.log(`✅ ${nextGeneration}차 단어장 생성 완료:`, newAssignment.id)

      return newAssignment
    } catch (err) {
      console.error('다음 세대 생성 실패:', err)
      throw err
    }
  }

  // 완성 단어장 생성
  const createCompletedWordlist = async (completedCount?: number) => {
    if (!student || !currentAssignment) return null

    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. Day 번호 먼저 계산 (정확한 값 사용)
      const actualCompleted = completedCount !== undefined ? completedCount : progress.generationCompleted
      const dayNumber = Math.ceil(actualCompleted / currentAssignment.daily_goal)

      // 2. 이미 생성된 완성 단어장 확인 (중복 방지 - Race Condition 대응)
      const { data: existingCheck } = await supabase
        .from('completed_wordlists')
        .select('id, word_ids')
        .eq('assignment_id', currentAssignment.id)
        .eq('day_number', dayNumber)
        .eq('completed_date', today)
        .maybeSingle()

      if (existingCheck) {
        console.log(`⚠️ Day ${dayNumber} 완성 단어장이 이미 존재합니다. 기존 것을 사용합니다.`)
        return {
          completedWordlistId: existingCheck.id,
          dayNumber,
          wordCount: existingCheck.word_ids.length,
          generation: currentAssignment.generation
        }
      }

      // 3. 오늘 이미 생성된 다른 Day 완성 단어장들의 단어 ID 수집
      const { data: existingWordlists } = await supabase
        .from('completed_wordlists')
        .select('word_ids')
        .eq('student_id', student.id)
        .eq('assignment_id', currentAssignment.id)
        .eq('completed_date', today)

      const existingWordIds = new Set(
        existingWordlists?.flatMap(wl => wl.word_ids) || []
      )

      // 4. 오늘 완료한 단어 중 아직 완성 단어장에 포함되지 않은 단어만
      let progressQuery = supabase
        .from('student_word_progress')
        .select('word_id, updated_at')
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .eq('completed_date', today)
        .order('updated_at', { ascending: true })

      if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
        progressQuery = progressQuery.in('word_id', currentAssignment.filtered_word_ids)
      }

      const { data: progressData, error: progressError } = await progressQuery

      if (progressError) throw progressError

      // 5. 이미 포함된 단어 제외하고 daily_goal 개수만큼
      const wordIds = (progressData?.map(p => p.word_id) || [])
        .filter(id => !existingWordIds.has(id))
        .slice(0, currentAssignment.daily_goal)

      if (wordIds.length === 0) {
        console.warn('⚠️ 완료한 단어가 없습니다 (이미 모두 완성 단어장에 포함됨)')
        return null
      }

      // ⭐ 최소 단어 수 검증 (daily_goal 개수 미만이면 생성 안 함)
      if (wordIds.length < currentAssignment.daily_goal) {
        console.error(`❌ Day ${dayNumber} 완성 단어장 생성 실패: 단어 수 부족`)
        console.error(`   필요: ${currentAssignment.daily_goal}개`)
        console.error(`   실제: ${wordIds.length}개`)
        console.error(`   누락: ${currentAssignment.daily_goal - wordIds.length}개`)
        console.warn('⚠️ 원인: Skip된 단어가 있을 가능성이 높습니다')
        console.warn('⚠️ 해결: Skip된 단어를 모두 학습한 후 다시 시도하세요')
        console.warn(`⚠️ 현재 ${wordIds.length}개만 완료되어 Day ${dayNumber} 생성이 보류되었습니다`)
        return null
      }

      // 6. 완성 단어장 생성 (UNIQUE 제약으로 중복 방지)
      const { data: completedWordlist, error: insertError } = await supabase
        .from('completed_wordlists')
        .insert({
          student_id: student.id,
          wordlist_id: currentAssignment.base_wordlist_id,
          assignment_id: currentAssignment.id,
          generation: currentAssignment.generation,
          day_number: dayNumber,
          word_ids: wordIds,
          completed_date: today,
          online_test_completed: false
        })
        .select()
        .single()

      if (insertError) {
        // 7. UNIQUE 제약 위반 시 처리 (Race Condition)
        if (insertError.code === '23505') {
          console.warn(`⚠️ Day ${dayNumber} 완성 단어장이 이미 존재합니다 (Race condition). 기존 것을 조회합니다.`)
          const { data: existing } = await supabase
            .from('completed_wordlists')
            .select('id, word_ids')
            .eq('assignment_id', currentAssignment.id)
            .eq('day_number', dayNumber)
            .eq('completed_date', today)
            .single()
          
          if (existing) {
            return {
              completedWordlistId: existing.id,
              dayNumber,
              wordCount: existing.word_ids.length,
              generation: currentAssignment.generation
            }
          }
        }
        throw insertError
      }

      console.log(`✅ Day ${dayNumber} (${currentAssignment.generation}차) 완성 단어장 생성 완료`, {
        wordIds,
        count: wordIds.length
      })

      return { 
        completedWordlistId: completedWordlist.id, 
        dayNumber,
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

      // 진도 업데이트
      const { error } = await supabase
        .from('student_word_progress')
        .upsert({
          student_id: student.id,
          word_id: currentWord.id,
          status: 'completed',
          completed_date: today,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,word_id'
        })

      if (error) throw error

      // 완료 목록에 추가
      setCompletedWords([currentWord, ...completedWords])
      
      // 진행률 업데이트 - 정확한 계산
      const newGenerationCompleted = progress.generationCompleted + 1
      const newTodayProgress = newGenerationCompleted % currentAssignment.daily_goal
      const newDay = newGenerationCompleted === 0 
        ? 1 
        : Math.ceil(newGenerationCompleted / currentAssignment.daily_goal)
      
      setProgress(prev => ({ 
        ...prev, 
        today: newTodayProgress,
        generationCompleted: newGenerationCompleted,
        day: newDay
      }))

      // A. 일일 목표 달성 체크 (배수 체크)
      if (newGenerationCompleted % currentAssignment.daily_goal === 0) {
        // 완성 단어장 생성 (정확한 completed 값 전달)
        const completedData = await createCompletedWordlist(newGenerationCompleted)
        
        // completedData가 null이면 에러 처리 (Skip된 단어로 인한 부족)
        if (!completedData) {
          console.error('❌ 완성 단어장 생성 실패 - Skip된 단어가 있을 가능성')
          console.warn('⚠️ Day 완료 처리를 건너뛰고 다음 단어를 계속 학습합니다')
          // Day 완료 처리 안 하고 다음 단어 로드
          await fetchNextWord()
          return { goalAchieved: false }
        }
        
        // B. 세대 완료 체크
        const isGenerationComplete = await checkGenerationComplete()
        
        if (isGenerationComplete) {
          const skippedWords = await getSkippedWordsInGeneration()
          
          if (skippedWords.length > 0) {
            // 다음 세대 생성
            await createNextGeneration(skippedWords)
            
            return { 
              goalAchieved: true,
              completedWordlistData: completedData,
              generationComplete: true,
              nextGenerationCreated: true,
              skippedCount: skippedWords.length
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
        
        // 일일 목표만 달성 - 모달 닫은 후 fetchNextWord 호출됨
        return { 
          goalAchieved: true,
          completedWordlistData: completedData,
          generationComplete: false
        }
      }

      // 다음 단어 로드
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
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      // skip_count 증가
      const { data: existingProgress } = await supabase
        .from('student_word_progress')
        .select('skip_count')
        .eq('student_id', student.id)
        .eq('word_id', currentWord.id)
        .single()

      const currentSkipCount = existingProgress?.skip_count || 0
      const newSkipCount = currentSkipCount + 1

      await supabase
        .from('student_word_progress')
        .upsert({
          student_id: student.id,
          word_id: currentWord.id,
          status: 'skipped',
          skip_count: newSkipCount,
          next_appear_date: tomorrowStr,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,word_id'
        })

      return {
        skipCount: newSkipCount,
        word: currentWord
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
    fetchNextWord
  }
}
