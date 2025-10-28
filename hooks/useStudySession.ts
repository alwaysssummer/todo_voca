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
  const fetchNextWord = async () => {
    if (!student || !currentAssignment) return

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

      let query = supabase
        .from('student_word_progress')
        .select(`
          word_id,
          words:word_id (
            id,
            word_text,
            meaning,
            wordlist_id
          )
        `)
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .eq('completed_date', today)
        .order('updated_at', { ascending: false })

      if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
        query = query.in('word_id', currentAssignment.filtered_word_ids)
      }

      const { data, error } = await query

      if (error) throw error

      const words = data
        ?.map(item => (item as any).words)
        .filter(Boolean) || []

      setCompletedWords(words)
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
  const createCompletedWordlist = async () => {
    if (!student || !currentAssignment) return null

    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. 오늘 완료한 단어 ID 목록 가져오기
      let progressQuery = supabase
        .from('student_word_progress')
        .select('word_id')
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .eq('completed_date', today)
        .order('updated_at', { ascending: true })
        .limit(currentAssignment.daily_goal)

      if (currentAssignment.filtered_word_ids && currentAssignment.filtered_word_ids.length > 0) {
        progressQuery = progressQuery.in('word_id', currentAssignment.filtered_word_ids)
      }

      const { data: progressData, error: progressError } = await progressQuery

      if (progressError) throw progressError

      const wordIds = progressData?.map(p => p.word_id) || []

      if (wordIds.length === 0) {
        throw new Error('완료한 단어가 없습니다')
      }

      // 2. Day 번호 계산 (세대 진행률 기반)
      const dayNumber = Math.ceil(progress.generationCompleted / currentAssignment.daily_goal)

      // 3. 완성 단어장 생성
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

      if (insertError) throw insertError

      console.log(`✅ Day ${dayNumber} (${currentAssignment.generation}차) 완성 단어장 생성 완료`)

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
      
      // 진행률 업데이트
      const newToday = progress.today + 1
      const newGenerationCompleted = progress.generationCompleted + 1
      
      setProgress(prev => ({ 
        ...prev, 
        today: newToday,
        generationCompleted: newGenerationCompleted
      }))

      // A. 일일 목표 달성 체크 (배수 체크)
      if (newGenerationCompleted % currentAssignment.daily_goal === 0) {
        // 완성 단어장 생성
        const completedData = await createCompletedWordlist()
        
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
        
        // 일일 목표만 달성
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
