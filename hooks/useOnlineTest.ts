'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Question, TestResult } from '@/types/test'

export function useOnlineTest(
  completedWordlistId: string,
  testType: 'known' | 'unknown' = 'known'  // ⭐ 신규: O-TEST(기본) / X-TEST
) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [completedWordlistInfo, setCompletedWordlistInfo] = useState<{
    dayNumber: number
    completedCount: number
  } | null>(null)

  // 평가 문제 생성 (O-TEST: 30%, X-TEST: 100%)
  useEffect(() => {
    async function generateQuestions() {
      try {
        // 1. 완성 단어장에서 word_ids 가져오기
        const { data: wordlistData, error: wordlistError } = await supabase
          .from('completed_wordlists')
          .select('word_ids, unknown_word_ids, student_id, session_number')
          .eq('id', completedWordlistId)
          .single<{ word_ids: number[]; unknown_word_ids: number[] | null; student_id: string; session_number: number }>()

        if (wordlistError) throw wordlistError
        if (!wordlistData) throw new Error('완성 단어장을 찾을 수 없습니다')

        // ⭐ testType에 따라 단어 선택
        const wordIds = testType === 'known' 
          ? wordlistData.word_ids                    // ✅ O-TEST: 안다 단어
          : (wordlistData.unknown_word_ids || [])    // ❌ X-TEST: 모른다 단어

        // ⭐ 평가 비율 설정
        const TEST_PERCENTAGE = testType === 'known' ? 0.3 : 1.0  // O-TEST: 30%, X-TEST: 100%
        const TEST_MIN_QUESTIONS = 3  // 최소 3문제 (30%에 가깝게)
        const questionCount = Math.max(TEST_MIN_QUESTIONS, Math.floor(wordIds.length * TEST_PERCENTAGE))
        
        const testTypeName = testType === 'known' ? 'O-TEST (안다)' : 'X-TEST (모른다)'
        console.log(`📊 ${testTypeName} 평가 설정: ${TEST_PERCENTAGE * 100}% (최소 ${TEST_MIN_QUESTIONS}문제)`)
        console.log(`📝 총 ${wordIds.length}개 중 ${questionCount}개 출제`)

        // 완성 단어장 정보 저장
        setCompletedWordlistInfo({
          dayNumber: wordlistData.session_number,
          completedCount: wordIds.length
        })

        // 2. 무작위로 단어 선택
        const shuffled = [...wordIds].sort(() => Math.random() - 0.5)
        const selectedIds = shuffled.slice(0, questionCount)

        // 3. 선택된 단어의 정보 가져오기
        const { data: wordsData, error: wordsError } = await supabase
          .from('words')
          .select('id, word_text, meaning')
          .in('id', selectedIds)
          .returns<{ id: number; word_text: string; meaning: string }[]>()

        if (wordsError) throw wordsError
        if (!wordsData || wordsData.length === 0) throw new Error('단어 정보를 찾을 수 없습니다')

        // 4. 질문 형식으로 변환 (객관식 선택지 생성)
        const questionList: Question[] = wordsData.map(word => {
          // 오답 선택지 생성 (다른 단어의 뜻 3개)
          const otherMeanings = wordsData
            .filter(w => w.id !== word.id)
            .map(w => w.meaning)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
          
          // 정답 + 오답 섞기
          const options = [word.meaning, ...otherMeanings]
            .sort(() => Math.random() - 0.5)
          
          return {
            wordId: word.id,
            word: word.word_text,
            correctAnswer: word.meaning,
            options: options
          }
        }).sort(() => Math.random() - 0.5)

        setQuestions(questionList)
        setLoading(false)
      } catch (err) {
        console.error('문제 생성 실패:', err)
        setLoading(false)
      }
    }

    if (completedWordlistId) {
      generateQuestions()
    }
  }, [completedWordlistId, testType])  // ⭐ testType 추가

  // 답안 입력
  const handleAnswerChange = (value: string) => {
    if (questions[currentIndex]) {
      setAnswers({
        ...answers,
        [questions[currentIndex].wordId]: value
      })
    }
  }

  // ⭐ 답안 선택 시 자동 진행
  useEffect(() => {
    if (!isSubmitting && questions[currentIndex] && answers[questions[currentIndex].wordId]) {
      const timer = setTimeout(() => {
        if (currentIndex === questions.length - 1) {
          // 마지막 문제 - 자동 제출
          handleSubmit()
        } else {
          // 다음 문제로 이동
          setCurrentIndex(currentIndex + 1)
        }
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [answers, currentIndex, isSubmitting, questions])

  // 이전 문제
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // 다음 문제
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // 제출 및 채점 (객관식 - 정규화 불필요!)
  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      let correctCount = 0
      const wrongWords: TestResult['wrongWords'] = []
      const correctWords: string[] = []

      // 채점 (객관식 - 단순 비교)
      questions.forEach(q => {
        const studentAnswer = answers[q.wordId] || ''

        if (studentAnswer === q.correctAnswer) {
          correctCount++
          correctWords.push(q.word)
        } else {
          wrongWords.push({
            wordId: q.wordId,
            word: q.word,
            studentAnswer: studentAnswer,
            correctAnswer: q.correctAnswer
          })
        }
      })

      const score = Math.round((correctCount / questions.length) * 100)
      const duration = 0  // ✅ 타이머 없으므로 0

      // 결과 저장
      const { data: completedWordlist } = await supabase
        .from('completed_wordlists')
        .select('student_id')
        .eq('id', completedWordlistId)
        .single<{ student_id: string }>()

      if (completedWordlist) {
        // online_tests 테이블에 저장
        await (supabase as any).from('online_tests').insert({
          student_id: completedWordlist.student_id,
          completed_wordlist_id: completedWordlistId,
          test_type: testType,  // ⭐ O-TEST('known') 또는 X-TEST('unknown')
          total_questions: questions.length,
          correct_count: correctCount,
          score: score,
          wrong_word_ids: wrongWords.map(w => w.wordId),
          test_duration_seconds: duration
        })

        // completed_wordlists 업데이트
        await (supabase as any)
          .from('completed_wordlists')
          .update({
            online_test_completed: true,
            online_test_score: score
          })
          .eq('id', completedWordlistId)
      }

      // 결과 설정
      setResult({
        score,
        correctCount,
        totalQuestions: questions.length,
        wrongWords,
        correctWords
      })
    } catch (err) {
      console.error('평가 제출 실패:', err)
      alert('평가 제출 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    questions,
    currentIndex,
    answers,
    loading,
    isSubmitting,
    result,
    completedWordlistInfo,
    handleAnswerChange,
    handlePrevious,
    handleNext,
    handleSubmit,
    canGoNext: currentIndex < questions.length - 1,
    canGoPrevious: currentIndex > 0,
    currentAnswer: questions[currentIndex] ? answers[questions[currentIndex].wordId] || '' : ''
  }
}

