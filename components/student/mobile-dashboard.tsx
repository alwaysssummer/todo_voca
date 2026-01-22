'use client'

import { useState, useMemo, useCallback } from 'react'
import { useStudentDashboard } from '@/hooks/useStudentDashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Play,
  Award,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react'
import { UnknownWordsModal } from '@/components/student/unknown-words-modal'
import { KnownWordsModal } from '@/components/student/known-words-modal'
import { TestResultModal } from '@/components/student/test-result-modal'

interface MobileDashboardProps {
  token: string
}

export function MobileDashboard({ token }: MobileDashboardProps) {
  const router = useRouter()
  const { data, loading, error } = useStudentDashboard(token)

  // ⭐ useMemo로 감싸서 매 렌더마다 새 배열 생성 방지
  const completedSessionsRaw = useMemo(
    () => data?.completedSessions ?? [],
    [data?.completedSessions]
  )
  const assignments = useMemo(
    () => data?.assignments ?? [],
    [data?.assignments]
  )

  // ⭐ 메인 탭 상태 (학습 | 기록)
  const [mainTab, setMainTab] = useState<'study' | 'record'>('study')

  // ⭐ 기록 탭 - 월 선택 상태
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // 단어장 탭 선택 상태
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0)

  // 선택된 단어장
  const selectedAssignment = assignments[selectedTabIndex] || assignments[0] || null

  // 선택된 단어장 및 관련 단어장(같은 base_wordlist_id)의 세션 필터링
  const getSessionsForAssignment = useCallback((assignment: typeof selectedAssignment) => {
    if (!assignment) return []

    const baseId = assignment.base_wordlist_id || assignment.wordlist_id
    const relatedAssignmentIds = assignments
      .filter(a => (a.base_wordlist_id || a.wordlist_id) === baseId)
      .map(a => a.id)

    return completedSessionsRaw.filter(session =>
      relatedAssignmentIds.includes(session.assignment_id)
    )
  }, [assignments, completedSessionsRaw])

  const filteredCompletedSessions = useMemo(() => {
    return getSessionsForAssignment(selectedAssignment)
  }, [selectedAssignment, getSessionsForAssignment])

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

  // ⭐ 기록 탭용 - 선택한 월의 날짜별 학습 기록
  const recordData = useMemo(() => {
    const { year, month } = selectedMonth

    // 해당 월의 모든 날짜 생성 (역순 - 최신 날짜가 위로)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dates: { date: Date; dateStr: string; dayOfWeek: string }[] = []

    for (let d = daysInMonth; d >= 1; d--) {
      const date = new Date(year, month, d)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
      dates.push({ date, dateStr, dayOfWeek })
    }

    // assignment_id로 wordlist_name 매핑
    const assignmentMap = new Map<string, string>()
    assignments.forEach(a => {
      assignmentMap.set(a.id, a.wordlist_name)
    })

    // 날짜별 + 단어장별 회차 기록 집계
    const recordMap = new Map<string, Map<string, number[]>>()  // dateStr -> wordlistName -> sessions[]

    completedSessionsRaw.forEach(session => {
      const dateStr = session.completed_date
      const wordlistName = assignmentMap.get(session.assignment_id) || 'Unknown'

      if (!recordMap.has(dateStr)) {
        recordMap.set(dateStr, new Map())
      }
      const dayRecord = recordMap.get(dateStr)!
      if (!dayRecord.has(wordlistName)) {
        dayRecord.set(wordlistName, [])
      }
      dayRecord.get(wordlistName)!.push(session.session_number)
    })

    // 사용된 단어장 목록 (순서 유지)
    const wordlistNames = assignments.map(a => a.wordlist_name)

    // 학습 기록이 있는 날짜만 필터링
    const datesWithRecords = dates.filter(d => recordMap.has(d.dateStr))

    return {
      dates: datesWithRecords,
      recordMap,
      wordlistNames,
      allDates: dates
    }
  }, [selectedMonth, completedSessionsRaw, assignments])

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

  // 테스트 결과 모달 state
  const [testResultModalOpen, setTestResultModalOpen] = useState(false)
  const [testResultModalData, setTestResultModalData] = useState<{
    sessionNumber: number
    testType: 'known' | 'unknown'
    wrongWordIds: number[] | null
  } | null>(null)

  // 테스트 결과 보기 핸들러
  const handleViewTestResult = (
    sessionNumber: number,
    testType: 'known' | 'unknown',
    wrongWordIds: number[] | null
  ) => {
    setTestResultModalData({
      sessionNumber,
      testType,
      wrongWordIds
    })
    setTestResultModalOpen(true)
  }

  // 월 이동
  const changeMonth = (delta: number) => {
    setSelectedMonth(prev => {
      let newMonth = prev.month + delta
      let newYear = prev.year
      if (newMonth < 0) {
        newMonth = 11
        newYear--
      } else if (newMonth > 11) {
        newMonth = 0
        newYear++
      }
      return { year: newYear, month: newMonth }
    })
  }

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
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h2 className="font-semibold text-destructive">오류 발생</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {error?.message || '알 수 없는 오류가 발생했습니다'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { student } = data

  if (!selectedAssignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h2 className="font-semibold text-destructive">단어장 없음</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              배정된 단어장이 없습니다. 선생님에게 문의해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ⭐ 통계 계산
  const completedSessionsCount = sessions.length
  const currentSession = completedSessionsCount + 1  // 다음 학습할 회차
  const totalSessions = Math.ceil(selectedAssignment.total_words / student.session_goal)

  const isGenerationCompleted = selectedAssignment.completed_words >= selectedAssignment.total_words

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 - 모바일 최적화 */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          {/* 학생 이름 + 탭 스위치 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-base">{student.name}</span>
            </div>

            {/* ⭐ 학습/기록 탭 스위치 */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setMainTab('study')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mainTab === 'study'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                학습
              </button>
              <button
                onClick={() => setMainTab('record')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                  mainTab === 'record'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                기록
              </button>
            </div>
          </div>
        </div>

        {/* 단어장 탭 - 학습 탭에서만, 2개 이상일 때만 표시 */}
        {mainTab === 'study' && assignments.length > 1 && (
          <div className="flex border-t">
            {assignments.map((assignment, index) => (
              <button
                key={assignment.id}
                onClick={() => setSelectedTabIndex(index)}
                className={`flex-1 px-2 py-2.5 text-sm truncate transition-colors ${
                  selectedTabIndex === index
                    ? 'text-blue-600 border-b-2 border-blue-600 font-medium bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {assignment.wordlist_name.length > 12
                  ? assignment.wordlist_name.slice(0, 12) + '...'
                  : assignment.wordlist_name
                }
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 메인 콘텐츠 */}
      <main className="px-4 py-4">
        {mainTab === 'study' ? (
          // ⭐ 학습 탭 (기존 내용)
          <>
            {/* 학습 버튼 - 모바일 최적화 */}
            <Button
              size="lg"
              className="w-full h-16 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base"
              onClick={() => {
                sessionStorage.setItem('dashboardMode', 'mobile')
                router.push(`/s/${token}/mobile/study?assignment=${selectedAssignment.id}`)
              }}
              disabled={isGenerationCompleted}
            >
              {isGenerationCompleted ? (
                <>
                  <Award className="mr-2 h-5 w-5" />
                  학습 완료
                </>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <Play className="h-5 w-5 flex-shrink-0" />
                  <span className="text-lg font-semibold">{currentSession}/{totalSessions}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((selectedAssignment.completed_words / selectedAssignment.total_words) * 100)}%` }}
                      />
                    </div>
                    <span className="text-base font-medium min-w-[3rem] text-right">
                      {Math.round((selectedAssignment.completed_words / selectedAssignment.total_words) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </Button>

            {/* 학습 기록 - 모바일 최적화 */}
            <Card>
              <CardContent className="p-4">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">아직 완성된 회차가 없습니다</p>
                    <p className="text-sm mt-1">학습을 시작해보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 회차 목록 */}
                    {sessions.map((session) => {
                      const knownCount = session.word_count || 0
                      const unknownCount = session.unknown_count || 0

                      return (
                        <Card key={session.id} className="hover:shadow-md transition-shadow border-2">
                          <CardContent className="p-4">
                            {/* 회차 번호 + 날짜 */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-bold text-lg">
                                {String(session.session_number).padStart(2, '0')}회차
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {(new Date(session.completed_date).getMonth() + 1)}/{new Date(session.completed_date).getDate()}
                              </div>
                            </div>

                            {/* O-TEST 영역 */}
                            <div className="mb-3 pb-3 border-b">
                              <div className="flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 h-12"
                                  onClick={() => {
                                    setSelectedKnownSession({
                                      id: session.id,
                                      sessionNumber: session.session_number,
                                      knownCount: knownCount
                                    })
                                    setKnownWordsOpen(true)
                                  }}
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                  <span className="text-base font-semibold">{knownCount}</span>
                                </Button>

                                {/* O-TEST 평가 상태 */}
                                <div className="flex items-center justify-center min-w-[5rem]">
                                  {session.o_test_completed ? (
                                    <div
                                      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => handleViewTestResult(
                                        session.session_number,
                                        'known',
                                        session.o_test_wrong_word_ids
                                      )}
                                      title="테스트 결과 보기"
                                    >
                                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                                      <span className="text-base font-semibold text-green-700">
                                        {session.o_test_correct}/{session.o_test_total}
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                                      onClick={() => {
                                        sessionStorage.setItem('dashboardMode', 'mobile')
                                        router.push(`/s/${token}/test/${session.id}?type=known`)
                                      }}
                                      title="O-TEST 평가 시작"
                                      aria-label="O-TEST 평가 시작하기"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* X-TEST 영역 */}
                            <div>
                              <div className="flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-12"
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
                                  <XCircle className="w-5 h-5" />
                                  <span className="text-base font-semibold">{unknownCount}</span>
                                </Button>

                                {/* X-TEST 평가 상태 */}
                                <div className="flex items-center justify-center min-w-[5rem]">
                                  {unknownCount === 0 ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                                      <span className="text-base font-semibold text-orange-700">
                                        0/0
                                      </span>
                                    </div>
                                  ) : session.x_test_completed ? (
                                    <div
                                      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => handleViewTestResult(
                                        session.session_number,
                                        'unknown',
                                        session.x_test_wrong_word_ids
                                      )}
                                      title="테스트 결과 보기"
                                    >
                                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                                      <span className="text-base font-semibold text-orange-700">
                                        {session.x_test_correct}/{session.x_test_total}
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                                      onClick={() => {
                                        sessionStorage.setItem('dashboardMode', 'mobile')
                                        router.push(`/s/${token}/test/${session.id}?type=unknown`)
                                      }}
                                      title="X-TEST 평가 시작"
                                      aria-label="X-TEST 평가 시작하기"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          // ⭐ 기록 탭 (새로 추가)
          <>
            {/* 월 선택 헤더 */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-lg px-4 py-3 shadow-sm">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="font-semibold text-lg">
                {selectedMonth.year}년 {selectedMonth.month + 1}월
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* 학습 기록 테이블 */}
            <Card>
              <CardContent className="p-0">
                {recordData.dates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">이 달에 학습 기록이 없습니다</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap border-b">
                            날짜
                          </th>
                          {recordData.wordlistNames.map((name, idx) => (
                            <th
                              key={idx}
                              className="px-2 py-2.5 text-center font-medium text-gray-600 border-b min-w-[60px]"
                            >
                              <span className="block truncate max-w-[60px]" title={name}>
                                {name.length > 5 ? name.slice(0, 5) + '..' : name}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recordData.dates.map((dateInfo, rowIdx) => {
                          const dayRecord = recordData.recordMap.get(dateInfo.dateStr)
                          const day = dateInfo.date.getDate()

                          return (
                            <tr
                              key={dateInfo.dateStr}
                              className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                            >
                              <td className="px-3 py-2.5 whitespace-nowrap border-b">
                                <span className="font-medium">{day}</span>
                                <span className="text-gray-400 ml-1">({dateInfo.dayOfWeek})</span>
                              </td>
                              {recordData.wordlistNames.map((name, colIdx) => {
                                const sessions = dayRecord?.get(name) || []
                                return (
                                  <td
                                    key={colIdx}
                                    className="px-2 py-2.5 text-center border-b"
                                  >
                                    {sessions.length > 0 ? (
                                      <span className="text-blue-600 font-semibold">
                                        {sessions.sort((a, b) => a - b).join(',')}
                                      </span>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 월 통계 */}
            <div className="mt-4 bg-white rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">이번 달 학습 일수</span>
                <span className="font-semibold text-blue-600">{recordData.dates.length}일</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">이번 달 총 회차</span>
                <span className="font-semibold text-blue-600">
                  {completedSessionsRaw.filter(s => {
                    const d = new Date(s.completed_date)
                    return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month
                  }).length}회
                </span>
              </div>
            </div>
          </>
        )}
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
