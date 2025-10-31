'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TestResult {
  score: number
  correctCount: number
  totalQuestions: number
  wrongWords: {
    wordId: number
    word: string
    studentAnswer: string
    correctAnswer: string
  }[]
  correctWords: string[]
}

interface TestResultScreenProps {
  result: TestResult
  studentToken: string
}

export function TestResultScreen({ result, studentToken }: TestResultScreenProps) {
  const router = useRouter()

  const handleGoToDashboard = () => {
    // sessionStorage 또는 URL 경로로 모바일 모드 판단
    const isMobile = sessionStorage.getItem('dashboardMode') === 'mobile' ||
                     window.location.pathname.includes('/mobile/')
    const dashboardPath = isMobile 
      ? `/s/${studentToken}/mobile/dashboard`
      : `/s/${studentToken}/dashboard`
    router.push(dashboardPath)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="text-center space-y-6 py-8">
          {/* 트로피 아이콘 */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 text-4xl animate-pulse">
                ✨
              </div>
            </div>
          </div>

          {/* 제목 */}
          <CardTitle className="text-3xl font-bold">평가 완료!</CardTitle>

          {/* 결과 요약 */}
          <div className="flex justify-center gap-3">
            <Badge variant="secondary" className="text-base px-4 py-2">
              정답 {result.correctCount}
            </Badge>
            <Badge variant="secondary" className="text-base px-4 py-2">
              오답 {result.wrongWords.length}
            </Badge>
          </div>

          {/* 확인 버튼 */}
          <div className="pt-2">
            <Button
              onClick={handleGoToDashboard}
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              확인
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

