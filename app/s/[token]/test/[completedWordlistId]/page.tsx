'use client'

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { TestStartScreen } from '@/components/student/test-start-screen'
import { TestQuestionScreen } from '@/components/student/test-question-screen'
import { TestResultScreen } from '@/components/student/test-result-screen'
import { useOnlineTest } from '@/hooks/useOnlineTest'
import { useRouter } from 'next/navigation'

export default function OnlineTestPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = params.token as string
  const completedWordlistId = params.completedWordlistId as string
  
  // ⭐ URL에서 test type 파라미터 읽기 (O-TEST: known, X-TEST: unknown)
  const testType = (searchParams.get('type') as 'known' | 'unknown') || 'known'

  // ⭐ 바로 평가 시작 (시작 화면 건너뛰기)
  const [testStarted, setTestStarted] = useState(true)

  const {
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
    canGoNext,
    canGoPrevious,
    currentAnswer
  } = useOnlineTest(completedWordlistId, testType)

  const handleStartTest = () => {
    setTestStarted(true)
  }

  const handleClose = () => {
    router.push(`/s/${token}`)
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">평가 준비 중...</p>
        </div>
      </div>
    )
  }

  // 결과 화면
  if (result) {
    return <TestResultScreen result={result} studentToken={token} />
  }

  // 평가 시작 전
  if (!testStarted) {
    return (
      <TestStartScreen
        completedCount={completedWordlistInfo?.completedCount || 0}
        dayNumber={completedWordlistInfo?.dayNumber || 1}
        onStartTest={handleStartTest}
        onClose={handleClose}
      />
    )
  }

  // 평가 진행 중
  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length

  return (
    <TestQuestionScreen
      word={currentQuestion.word}
      options={currentQuestion.options}  // 👈 추가: 객관식 선택지
      currentIndex={currentIndex}
      totalQuestions={questions.length}
      currentAnswer={currentAnswer}
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext}
      isSubmitting={isSubmitting}
      answeredCount={answeredCount}
      onAnswerChange={handleAnswerChange}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={handleSubmit}
    />
  )
}

