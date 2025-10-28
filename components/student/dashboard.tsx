'use client'

import { useStudentDashboard } from '@/hooks/useStudentDashboard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { BookOpen, Target, Trophy, Calendar, CheckCircle2, Clock } from 'lucide-react'

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
  const progressPercentage = (currentAssignment.completed_words / currentAssignment.total_words) * 100
  // ⭐ Day 계산 통일: Math.ceil 사용
  const currentDay = currentAssignment.completed_words === 0 ? 1 : Math.ceil(currentAssignment.completed_words / student.daily_goal)
  const todayProgress = currentAssignment.completed_words % student.daily_goal
  // ⭐ 전체 세대 완료 여부 체크 (모든 단어를 학습했을 때만 버튼 비활성화)
  const isGenerationCompleted = currentAssignment.completed_words >= currentAssignment.total_words

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{student.name}</h1>
                <p className="text-sm text-muted-foreground">{currentAssignment.wordlist_name}</p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {currentAssignment.generation}차
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">전체 진행률</span>
                <span className="font-semibold">
                  {currentAssignment.completed_words}/{currentAssignment.total_words} 
                  ({progressPercentage.toFixed(0)}%)
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium">현재 Day {currentDay}</span>
              </div>
              <span className="text-muted-foreground">
                {todayProgress}/{student.daily_goal} 완료
              </span>
            </div>
          </div>
        </Card>

        {/* 빠른 액션 */}
        <div className="space-y-4">
          {/* ⭐ 학습 상태 카드 */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">오늘의 학습</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isGenerationCompleted 
                    ? '🎉 모든 단어를 완료했습니다!' 
                    : `${todayProgress}/${student.daily_goal} 완료`}
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={() => router.push(`/s/${token}`)}
                disabled={isGenerationCompleted}
                className="w-40"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                {isGenerationCompleted ? '학습 완료' : '학습 하기'}
              </Button>
            </div>
          </Card>

          {/* 평가 대기 중인 Day 알림 */}
          {(() => {
            const pendingTests = completedDays.filter(d => !d.test_completed)
            if (pendingTests.length > 0) {
              return (
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-yellow-800">평가 대기 중</h3>
                      <p className="text-sm text-yellow-700">
                        {pendingTests.length}개의 Day가 평가를 기다리고 있습니다
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => router.push(`/s/${token}/test/${pendingTests[0].id}`)}
                      className="w-40 border-yellow-300 hover:bg-yellow-100"
                    >
                      <Trophy className="mr-2 h-5 w-5" />
                      평가 시작
                    </Button>
                  </div>
                </Card>
              )
            }
            return null
          })()}
        </div>

        {/* 완성된 Day 목록 */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">완성된 Day</h2>
            <Badge variant="outline">{completedDays.length}개</Badge>
          </div>
          
          {completedDays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>아직 완성된 Day가 없습니다.</p>
              <p className="text-sm">학습을 시작해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedDays.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {day.generation}차
                        </Badge>
                        <span className="font-semibold">Day {day.day_number}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {day.word_count}개 완료 · {new Date(day.completed_date).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {day.test_completed && day.test_score !== null ? (
                      <Badge 
                        variant={day.test_score >= 80 ? "default" : "destructive"}
                        className="text-sm px-3"
                      >
                        {day.test_score}점
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-sm">
                        평가 대기
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/s/${token}/test/${day.id}`)}
                    >
                      {day.test_completed ? '결과 보기' : '평가 시작'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {completedDays.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">완성한 Day</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {currentAssignment.completed_words}
            </div>
            <div className="text-sm text-muted-foreground mt-1">완료한 단어</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {completedDays.filter(d => d.test_completed).length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">완료한 평가</div>
          </Card>
        </div>
      </div>
    </div>
  )
}

