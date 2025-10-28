'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, CheckCircle, XCircle, Home } from 'lucide-react'
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'from-green-50 to-emerald-100'
    if (score >= 70) return 'from-blue-50 to-indigo-100'
    if (score >= 50) return 'from-orange-50 to-amber-100'
    return 'from-red-50 to-pink-100'
  }

  const getGrade = (score: number) => {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  const handleGoToDashboard = () => {
    router.push(`/s/${studentToken}/dashboard`)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getScoreBgColor(result.score)} flex items-center justify-center p-4`}>
      <div className="w-full max-w-2xl space-y-6">
        {/* 점수 카드 */}
        <Card className="shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800">
              평가 완료!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 점수 표시 */}
            <div className="text-center space-y-2">
              <div className={`text-7xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}
                <span className="text-4xl">점</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {getGrade(result.score)} 등급
                </Badge>
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">정답</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {result.correctCount}
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-800">오답</span>
                </div>
                <div className="text-3xl font-bold text-red-600">
                  {result.wrongWords.length}
                </div>
              </div>
            </div>

            {/* 오답 리스트 */}
            {result.wrongWords.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  오답 노트
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.wrongWords.map((wrong, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-red-50 border border-red-100 rounded-lg"
                    >
                      <div className="font-semibold text-gray-800 mb-2">
                        {wrong.word}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex gap-2">
                          <span className="text-red-600 font-medium">내 답:</span>
                          <span className="text-gray-700">
                            {wrong.studentAnswer || '(미작성)'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-green-600 font-medium">정답:</span>
                          <span className="text-gray-700">{wrong.correctAnswer}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 정답 리스트 (간단히) */}
            {result.correctWords.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  맞춘 단어
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.correctWords.map((word, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                      {word}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 대시보드로 버튼 */}
            <Button
              onClick={handleGoToDashboard}
              className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700"
            >
              <Home className="w-5 h-5 mr-2" />
              대시보드로
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

