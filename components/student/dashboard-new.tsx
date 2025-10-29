'use client'

import { useStudentDashboard } from '@/hooks/useStudentDashboard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { BookOpen, Target } from 'lucide-react'

interface StudentDashboardProps {
  token: string
}

export function StudentDashboard({ token }: StudentDashboardProps) {
  const router = useRouter()
  const { data, loading, error } = useStudentDashboard(token)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <p className="text-red-600">오류가 발생했습니다: {error?.message}</p>
        </Card>
      </div>
    )
  }

  const { student, currentAssignment, completedDays } = data
  
  // ⭐ 통계 계산
  const currentDay = currentAssignment.completed_words === 0 ? 1 : Math.ceil(currentAssignment.completed_words / student.daily_goal)
  const totalDays = Math.ceil(currentAssignment.total_words / student.daily_goal)
  const todayProgress = currentAssignment.completed_words % student.daily_goal
  const completedDaysCount = completedDays.length
  
  // O-TEST, X-TEST 완료 통계 (향후 구현)
  const oTestCompleted = 0  // TODO: online_tests 테이블에서 조회
  const xTestCompleted = 0  // TODO: online_tests 테이블에서 조회
  
  const isGenerationCompleted = currentAssignment.completed_words >= currentAssignment.total_words

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 1. 헤더 */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📚 {student.name}</h1>
              <p className="text-sm text-muted-foreground">{currentAssignment.wordlist_name}</p>
            </div>
          </div>
        </Card>

        {/* 2. 진행 상황 요약 */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-3">📊 진행 상황</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>학습(완료):</span>
              <span className="font-semibold">{completedDaysCount}/{totalDays}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>O-TEST:</span>
              <span className="font-semibold">{oTestCompleted}/{completedDaysCount}</span>
              <span className="ml-4">X-TEST:</span>
              <span className="font-semibold">{xTestCompleted}/{completedDaysCount}</span>
            </div>
          </div>
        </Card>

        {/* 3. 학습 버튼 */}
        <Button 
          size="lg" 
          className="w-full h-14 text-lg"
          onClick={() => router.push(`/s/${token}`)}
          disabled={isGenerationCompleted}
        >
          <BookOpen className="mr-2 h-5 w-5" />
          {isGenerationCompleted ? '학습 완료' : `학습 하기 ${currentDay}/${totalDays}`}
        </Button>

        {/* 4. 완성된 Day 목록 */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">📝 학습 기록</h3>
          
          {completedDays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>아직 완성된 Day가 없습니다.</p>
              <p className="text-sm">학습을 시작해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedDays.map((day) => {
                const knownCount = day.word_count || 0
                const unknownCount = 0  // TODO: unknown_word_ids에서 계산
                
                return (
                  <div
                    key={day.id}
                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Day 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">🗓️ {day.day_number}/{totalDays}</span>
                        <span className="text-sm text-muted-foreground">
                          ({new Date(day.completed_date).toLocaleDateString('ko-KR', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          })})
                        </span>
                      </div>
                    </div>
                    
                    {/* O-TEST / X-TEST */}
                    <div className="flex items-center gap-4">
                      {/* O-TEST */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-3"
                          onClick={() => {
                            // TODO: 단어 목록 모달 표시
                            console.log('O 단어 목록 표시')
                          }}
                        >
                          ✅ O: {knownCount}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/s/${token}/test/${day.id}?type=known`)}
                        >
                          [T]
                        </Button>
                      </div>
                      
                      {/* X-TEST */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-3"
                          onClick={() => {
                            // TODO: 단어 목록 모달 표시
                            console.log('X 단어 목록 표시')
                          }}
                        >
                          ❌ X: {unknownCount}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/s/${token}/test/${day.id}?type=unknown`)}
                        >
                          [T]
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

