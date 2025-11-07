'use client'

import { useState, useMemo } from 'react'
import { useStudentDashboard } from '@/hooks/useStudentDashboard'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, 
  Loader2, 
  AlertCircle, 
  BarChart3,
  CheckCircle2,
  XCircle,
  Calendar,
  Play,
  Award,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { UnknownWordsModal } from '@/components/student/unknown-words-modal'
import { KnownWordsModal } from '@/components/student/known-words-modal'
import { ExamPrintModal } from '@/components/student/exam-print-modal'
import { VocabularyPrintModal } from '@/components/student/vocabulary-print-modal'
import { WholeVocabularyPrintModal } from '@/components/student/whole-vocabulary-print-modal'
import { TestResultModal } from '@/components/student/test-result-modal'

interface StudentDashboardProps {
  token: string
}

export function StudentDashboard({ token }: StudentDashboardProps) {
  const router = useRouter()
  const { data, loading, error } = useStudentDashboard(token)
  
  // 보기 모드 state (전체/주간/월간)
  const [viewMode, setViewMode] = useState<'all' | 'week' | 'month'>('all')
  
  // 주간/월간 이동 offset
  const [weekOffset, setWeekOffset] = useState(0) // 0 = 이번주, -1 = 이전주, +1 = 다음주
  const [monthOffset, setMonthOffset] = useState(0) // 0 = 이번달, -1 = 이전달, +1 = 다음달
  
  // 모르는 단어 모달 state
  const [unknownWordsOpen, setUnknownWordsOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<{
    id: string
    sessionNumber: number
    unknownCount: number
  } | null>(null)

  // 아는 단어 모달 state
  const [knownWordsOpen, setKnownWordsOpen] = useState(false)
  const [selectedKnownSession, setSelectedKnownSession] = useState<{
    id: string
    sessionNumber: number
    knownCount: number
  } | null>(null)

  // 시험지 출력용 체크박스 state
  const [selectedSessionsForExam, setSelectedSessionsForExam] = useState<string[]>([])
  
  // 시험지 출력 모달 state
  const [examModalOpen, setExamModalOpen] = useState(false)
  const [examModalType, setExamModalType] = useState<'known' | 'unknown'>('known')
  const [examModalTitle, setExamModalTitle] = useState('')

  // 단어장 출력 모달 state
  const [vocabModalOpen, setVocabModalOpen] = useState(false)
  const [vocabModalType, setVocabModalType] = useState<'known' | 'unknown'>('unknown')
  const [vocabModalTitle, setVocabModalTitle] = useState('')

  // 전체 단어장 출력 모달 state
  const [wholeVocabModalOpen, setWholeVocabModalOpen] = useState(false)

  // 테스트 결과 모달 state
  const [testResultModalOpen, setTestResultModalOpen] = useState(false)
  const [testResultModalData, setTestResultModalData] = useState<{
    sessionNumber: number
    testType: 'known' | 'unknown'
    wrongWordIds: string[] | null
  } | null>(null)

  // 체크박스 토글 함수
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionsForExam(prev => 
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    )
  }

  // 시험지 출력 핸들러
  const handleExamPrint = (type: 'known' | 'unknown') => {
    console.log(`${type === 'known' ? '아는' : '모르는'} 단어 시험지 출력`)
    console.log('선택된 회차:', selectedSessionsForExam)
    
    const title = type === 'known' 
      ? `아는 단어 시험지 (${selectedSessionsForExam.length}개 회차)`
      : `모르는 단어 시험지 (${selectedSessionsForExam.length}개 회차)`
    
    setExamModalType(type)
    setExamModalTitle(title)
    setExamModalOpen(true)
  }

  // 단어장 출력 핸들러
  const handleVocabularyPrint = (type: 'known' | 'unknown') => {
    console.log(`${type === 'known' ? '아는' : '모르는'} 단어장 출력`)
    console.log('선택된 회차:', selectedSessionsForExam)
    
    const title = type === 'known'
      ? `아는 단어장 (${selectedSessionsForExam.length}개 회차)`
      : `모르는 단어장 (${selectedSessionsForExam.length}개 회차)`
    
    setVocabModalType(type)
    setVocabModalTitle(title)
    setVocabModalOpen(true)
  }

  // 전체 단어장 출력 핸들러
  const handleWholeVocabularyPrint = () => {
    console.log('전체 단어장 출력')
    console.log('currentAssignment:', currentAssignment)
    console.log('wordlist_id:', currentAssignment?.wordlist_id)
    setWholeVocabModalOpen(true)
  }

  // 테스트 결과 보기 핸들러
  const handleViewTestResult = (
    sessionNumber: number, 
    testType: 'known' | 'unknown',
    wrongWordIds: string[] | null
  ) => {
    setTestResultModalData({
      sessionNumber,
      testType,
      wrongWordIds
    })
    setTestResultModalOpen(true)
  }

  const completedSessionsRaw = data?.completedSessions ?? []
  const currentAssignmentId = data?.currentAssignment?.id ?? null

  const filteredCompletedSessions = useMemo(() => {
    if (!currentAssignmentId) {
      return completedSessionsRaw
    }
    return completedSessionsRaw.filter(session => session.assignment_id === currentAssignmentId)
  }, [completedSessionsRaw, currentAssignmentId])

  const sessions = useMemo(() => {
    const uniqueMap = new Map<string, (typeof filteredCompletedSessions)[number]>()
    filteredCompletedSessions
      .slice()
      .sort((a, b) => {
        if (a.session_number === b.session_number) {
          return new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime()
        }
        return b.session_number - a.session_number
      })
      .forEach(session => {
        const key = `${session.session_number}-${session.completed_date}`
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, session)
        }
      })
    return Array.from(uniqueMap.values()).sort((a, b) => {
      if (a.session_number === b.session_number) {
        return new Date(a.completed_date).getTime() - new Date(b.completed_date).getTime()
      }
      return a.session_number - b.session_number
    })
  }, [filteredCompletedSessions])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">오류 발생</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error?.message || '알 수 없는 오류가 발생했습니다'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { student, currentAssignment } = data
  
  // 날짜별로 세션 그룹핑
  const getSessionsByDate = () => {
    type Session = typeof sessions[number]
    const sessionsByDate: Record<string, Session[]> = {}
    
    sessions.forEach(session => {
      const date = new Date(session.completed_date)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = []
      }
      sessionsByDate[dateKey].push(session)
    })
    
    return sessionsByDate
  }
  
  // 주간 날짜 배열 생성 (월~일)
  const getWeekDays = () => {
    const days = []
    const today = new Date()
    const dayOfWeek = today.getDay() // 0(일) ~ 6(토)
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)) // 이번주 월요일
    
    // weekOffset 적용 (이전주/다음주 이동)
    monday.setDate(monday.getDate() + (weekOffset * 7))
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push(day)
    }
    
    return days
  }
  
  // 월간 달력 배열 생성
  const getMonthCalendar = () => {
    const today = new Date()
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDay.getDay() // 0(일) ~ 6(토)
    
    const calendar = []
    
    // 빈칸 추가 (이전 달)
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendar.push(null)
    }
    
    // 날짜 추가
    for (let date = 1; date <= lastDay.getDate(); date++) {
      calendar.push(new Date(year, month, date))
    }
    
    return { calendar, year, month: month + 1 }
  }
  
  const sessionsByDate = getSessionsByDate()
  const weekDays = getWeekDays()
  const monthCalendar = getMonthCalendar()
  
  // 전체 선택/해제 토글 (모든 세션 대상)
  const toggleSelectAll = () => {
    if (selectedSessionsForExam.length === sessions.length) {
      // 전체 선택 상태 → 전체 해제
      setSelectedSessionsForExam([])
    } else {
      // 일부 또는 없음 → 전체 선택
      const allSessionIds = sessions.map(session => session.id)
      setSelectedSessionsForExam(allSessionIds)
    }
  }

  // 전체 선택 여부 계산
  const isAllSelected = sessions.length > 0 && 
                        selectedSessionsForExam.length === sessions.length
  
  // ⭐ 통계 계산
  const completedSessionsCount = sessions.length
  const currentSession = completedSessionsCount + 1  // 다음 학습할 회차
  const totalSessions = Math.ceil(currentAssignment.total_words / student.session_goal)
  
  const isGenerationCompleted = currentAssignment.completed_words >= currentAssignment.total_words

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{student.name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{currentAssignment.wordlist_name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* 학습 버튼 */}
        <Button 
          size="lg" 
          className="w-full h-14 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={() => router.push(`/s/${token}`)}
          disabled={isGenerationCompleted}
        >
          {isGenerationCompleted ? (
            <>
              <Award className="mr-2 h-5 w-5" />
              학습 완료
            </>
          ) : (
            <div className="flex items-center gap-4 w-full">
              <Play className="h-5 w-5 flex-shrink-0" />
              <span className="text-lg font-semibold">{currentSession}/{totalSessions}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((currentAssignment.completed_words / currentAssignment.total_words) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium min-w-[3rem] text-right">
                  {Math.round((currentAssignment.completed_words / currentAssignment.total_words) * 100)}%
                </span>
              </div>
            </div>
          )}
        </Button>

        {/* 학습 기록 */}
        <Card>
          <CardContent className="pt-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">아직 완성된 회차가 없습니다</p>
                <p className="text-sm mt-1">학습을 시작해보세요!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 전체 선택 + 보기 모드 + 출력 버튼들 */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b flex-wrap">
                  {/* 왼쪽: 전체 선택 + 보기 모드 */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      A
                      <span className="ml-1 text-blue-600 font-semibold">
                        ({selectedSessionsForExam.length}/{sessions.length})
                      </span>
                    </span>
                    
                    {/* 보기 모드 토글 */}
                    <div className="flex items-center gap-1 ml-4 border-l pl-4">
                      <Button
                        variant={viewMode === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('all')}
                        className="h-8 px-3"
                      >
                        A
                      </Button>
                      <Button
                        variant={viewMode === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('week')}
                        className="h-8 px-3"
                      >
                        W
                      </Button>
                      <Button
                        variant={viewMode === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('month')}
                        className="h-8 px-3"
                      >
                        M
                      </Button>
                    </div>
                  </div>
                  
                  {/* 오른쪽: 출력 버튼들 */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={selectedSessionsForExam.length === 0}
                      onClick={() => handleExamPrint('known')}
                    >
                      <Printer className="w-4 h-4" />
                      O
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={selectedSessionsForExam.length === 0}
                      onClick={() => handleExamPrint('unknown')}
                    >
                      <Printer className="w-4 h-4" />
                      X
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={selectedSessionsForExam.length === 0}
                      onClick={() => handleVocabularyPrint('known')}
                    >
                      <BookOpen className="w-4 h-4" />
                      O
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={selectedSessionsForExam.length === 0}
                      onClick={() => handleVocabularyPrint('unknown')}
                    >
                      <BookOpen className="w-4 h-4" />
                      X
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleWholeVocabularyPrint}
                    >
                      <BookOpen className="w-4 h-4" />
                      A
                    </Button>
                  </div>
                </div>

                {/* 전체 보기 - 회차 목록 */}
                {viewMode === 'all' && sessions.map((session) => {
                  const knownCount = session.word_count || 0
                  const unknownCount = session.unknown_count || 0
                  
                  return (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          {/* 왼쪽: 체크박스 + 회차 정보 */}
                          <div className="flex items-center gap-3">
                            {/* 시험지 출력용 체크박스 */}
                            <Checkbox
                              checked={selectedSessionsForExam.includes(session.id)}
                              onCheckedChange={() => toggleSessionSelection(session.id)}
                            />
                            
                            <div className="font-semibold text-base flex items-center gap-2">
                              <span>{String(session.session_number).padStart(2, '0')}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                {(new Date(session.completed_date).getMonth() + 1)}/{new Date(session.completed_date).getDate()}
                              </span>
                            </div>
                          </div>

                          {/* 오른쪽: 테스트 버튼들 */}
                          <div className="flex items-center gap-3">
                            {/* O-TEST */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedKnownSession({
                                    id: session.id,
                                    sessionNumber: session.session_number,
                                    knownCount: knownCount
                                  })
                                  setKnownWordsOpen(true)
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="inline-block min-w-[1.25rem] text-center">{knownCount}</span>
                              </Button>
                              
                              {/* O-TEST 평가 상태 */}
                              <div className="min-w-[4.5rem] flex items-center justify-center">
                                {session.o_test_completed ? (
                                  // 평가 완료: 점수 표시 (클릭 가능)
                                  <div 
                                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleViewTestResult(
                                      session.session_number,
                                      'known',
                                      session.o_test_wrong_word_ids
                                    )}
                                    title="테스트 결과 보기"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-green-700 whitespace-nowrap">
                                      {String(session.o_test_correct).padStart(2, ' ')}/{String(session.o_test_total).padStart(2, ' ')}
                                    </span>
                                  </div>
                                ) : (
                                  // 평가 전: 회색 원 버튼 + 투명 텍스트로 공간 확보
                                  <div className="relative flex items-center justify-center">
                                    <button
                                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center flex-shrink-0"
                                      onClick={() => router.push(`/s/${token}/test/${session.id}?type=known`)}
                                      title="O-TEST 평가 시작"
                                      aria-label="O-TEST 평가 시작하기"
                                    />
                                    <span className="absolute text-transparent select-none pointer-events-none text-sm font-medium">
                                      {String(0).padStart(2, ' ')}/{String(0).padStart(2, ' ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* X-TEST - 항상 표시 */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => {
                                  if (unknownCount > 0) {
                                    setSelectedSession({
                                      id: session.id,
                                      sessionNumber: session.session_number,
                                      unknownCount: unknownCount
                                    })
                                    setUnknownWordsOpen(true)
                                  }
                                }}
                                disabled={unknownCount === 0}
                              >
                                <XCircle className="w-4 h-4" />
                                <span className="inline-block min-w-[1.25rem] text-center">{unknownCount}</span>
                              </Button>
                              
                              {/* X-TEST 평가 상태 */}
                              <div className="min-w-[4.5rem] flex items-center justify-center">
                                {unknownCount === 0 ? (
                                  // 모르는 단어 없음: 자동 완료 표시 (0/0)
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                                      {String(0).padStart(2, ' ')}/{String(0).padStart(2, ' ')}
                                    </span>
                                  </div>
                                ) : session.x_test_completed ? (
                                  // 평가 완료: 점수 표시 (클릭 가능)
                                  <div 
                                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleViewTestResult(
                                      session.session_number,
                                      'unknown',
                                      session.x_test_wrong_word_ids
                                    )}
                                    title="테스트 결과 보기"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                                      {String(session.x_test_correct).padStart(2, ' ')}/{String(session.x_test_total).padStart(2, ' ')}
                                    </span>
                                  </div>
                                ) : (
                                  // 평가 전: 회색 원 버튼 + 투명 텍스트로 공간 확보
                                  <div className="relative flex items-center justify-center">
                                    <button
                                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center flex-shrink-0"
                                      onClick={() => router.push(`/s/${token}/test/${session.id}?type=unknown`)}
                                      title="X-TEST 평가 시작"
                                      aria-label="X-TEST 평가 시작하기"
                                    />
                                    <span className="absolute text-transparent select-none pointer-events-none text-sm font-medium">
                                      {String(0).padStart(2, ' ')}/{String(0).padStart(2, ' ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* 주간 보기 */}
                {viewMode === 'week' && (
                  <div>
                    {/* 주간 네비게이션 */}
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekOffset(weekOffset - 1)}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        이전주
                      </Button>
                      <div className="font-semibold">
                        {weekDays[0]?.getMonth() + 1}월 {weekDays[0]?.getDate()}일 - {weekDays[6]?.getMonth() + 1}월 {weekDays[6]?.getDate()}일
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekOffset(weekOffset + 1)}
                      >
                        다음주
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day, index) => {
                      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                      const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                      const sessions = sessionsByDate[dateKey] || []
                      
                      return (
                        <Card key={index} className="min-h-[120px]">
                          <CardContent className="p-2">
                            {/* 헤더: 요일 + 날짜 */}
                            <div className="text-center font-bold text-sm mb-2 pb-1 border-b">
                              <div>{dayNames[day.getDay()]}</div>
                              <div className="text-xs text-muted-foreground">
                                {day.getMonth() + 1}/{day.getDate()}
                              </div>
                            </div>
                            
                            {/* 회차 리스트 */}
                            <div className="space-y-1">
                              {sessions.length > 0 ? (
                                sessions
                                  .sort((a, b) => a.session_number - b.session_number)
                                  .map(session => (
                                    <div key={session.id} className="text-xs">
                                      {session.session_number}회 {session.x_test_correct}/{session.x_test_total}
                                    </div>
                                  ))
                              ) : (
                                <div className="text-center text-gray-300 text-sm">-</div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                    </div>
                  </div>
                )}

                {/* 월간 보기 */}
                {viewMode === 'month' && (
                  <div>
                    {/* 월간 네비게이션 */}
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonthOffset(monthOffset - 1)}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        이전달
                      </Button>
                      <div className="font-bold text-lg">
                        {monthCalendar.year}년 {monthCalendar.month}월
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonthOffset(monthOffset + 1)}
                      >
                        다음달
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    
                    {/* 달력 그리드 */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* 요일 헤더 */}
                      {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                        <div key={day} className="text-center font-bold text-sm py-2">
                          {day}
                        </div>
                      ))}
                      
                      {/* 날짜 셀 */}
                      {monthCalendar.calendar.map((day, index) => {
                        if (!day) {
                          return <div key={`empty-${index}`} className="min-h-[80px]" />
                        }
                        
                        const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                        const sessions = sessionsByDate[dateKey] || []
                        const sessionNumbers = sessions
                          .sort((a, b) => a.session_number - b.session_number)
                          .map(s => s.session_number)
                          .join('/')
                        
                        return (
                          <Card key={index} className="min-h-[80px]">
                            <CardContent className="p-1">
                              <div className="text-xs font-bold mb-1">
                                {day.getDate()}
                              </div>
                              <div className="text-xs text-center">
                                {sessionNumbers || '-'}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 모르는 단어 모달 */}
      {selectedSession && (
        <UnknownWordsModal
          open={unknownWordsOpen}
          onClose={() => {
            setUnknownWordsOpen(false)
            setSelectedSession(null)
          }}
          sessionId={selectedSession.id}
          sessionNumber={selectedSession.sessionNumber}
          unknownCount={selectedSession.unknownCount}
        />
      )}

      {/* 아는 단어 모달 */}
      {selectedKnownSession && (
        <KnownWordsModal
          open={knownWordsOpen}
          onClose={() => {
            setKnownWordsOpen(false)
            setSelectedKnownSession(null)
          }}
          sessionId={selectedKnownSession.id}
          sessionNumber={selectedKnownSession.sessionNumber}
          knownCount={selectedKnownSession.knownCount}
        />
      )}

      {/* 시험지 출력 모달 */}
      <ExamPrintModal
        open={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        sessionIds={selectedSessionsForExam}
        type={examModalType}
        title={examModalTitle}
      />

      {/* 단어장 출력 모달 (아는/모르는 단어장) */}
      <VocabularyPrintModal
        open={vocabModalOpen}
        onClose={() => setVocabModalOpen(false)}
        sessionIds={selectedSessionsForExam}
        type={vocabModalType}
        title={vocabModalTitle}
      />

      {/* 전체 단어장 출력 모달 */}
      {currentAssignment && (
        <WholeVocabularyPrintModal
          open={wholeVocabModalOpen}
          onClose={() => setWholeVocabModalOpen(false)}
          wordlistId={currentAssignment.wordlist_id}
          title={`전체 단어장 (${currentAssignment.total_words}개)`}
        />
      )}

      {/* 테스트 결과 모달 */}
      {testResultModalData && (
        <TestResultModal
          open={testResultModalOpen}
          onClose={() => {
            setTestResultModalOpen(false)
            setTestResultModalData(null)
          }}
          sessionNumber={testResultModalData.sessionNumber}
          testType={testResultModalData.testType}
          wrongWordIds={testResultModalData.wrongWordIds}
        />
      )}
    </div>
  )
}

