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
  Award
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

  const completedSessionsRaw = data?.completedSessions ?? []
  const assignments = data?.assignments ?? []

  // 탭 선택 상태
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
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-base">{student.name}</span>
          </div>
        </div>

        {/* 단어장 탭 - 2개 이상일 때만 표시 */}
        {assignments.length > 1 && (
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
                {/* 회차 목록 - 체크박스와 날짜 제거, 출력 버튼 제거 */}
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
                                // 평가 완료: 점수 표시 (클릭 가능)
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
                                // 평가 전: 회색 원 버튼
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
                                // 모르는 단어 없음: 자동 완료 표시 (0/0)
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                                  <span className="text-base font-semibold text-orange-700">
                                    0/0
                                  </span>
                                </div>
                              ) : session.x_test_completed ? (
                                // 평가 완료: 점수 표시 (클릭 가능)
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
                                // 평가 전: 회색 원 버튼
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
