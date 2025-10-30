'use client'

import { useState } from 'react'
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
  Printer
} from 'lucide-react'
import { UnknownWordsModal } from '@/components/student/unknown-words-modal'
import { KnownWordsModal } from '@/components/student/known-words-modal'
import { ExamPrintModal } from '@/components/student/exam-print-modal'
import { VocabularyPrintModal } from '@/components/student/vocabulary-print-modal'
import { WholeVocabularyPrintModal } from '@/components/student/whole-vocabulary-print-modal'

interface StudentDashboardProps {
  token: string
}

export function StudentDashboard({ token }: StudentDashboardProps) {
  const router = useRouter()
  const { data, loading, error } = useStudentDashboard(token)
  
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

  const { student, currentAssignment, completedSessions } = data
  
  // 전체 선택/해제 토글
  const toggleSelectAll = () => {
    if (selectedSessionsForExam.length === completedSessions.length) {
      // 전체 선택 상태 → 전체 해제
      setSelectedSessionsForExam([])
    } else {
      // 일부 또는 없음 → 전체 선택
      const allSessionIds = completedSessions.map(session => session.id)
      setSelectedSessionsForExam(allSessionIds)
    }
  }

  // 전체 선택 여부 계산
  const isAllSelected = completedSessions.length > 0 && 
                        selectedSessionsForExam.length === completedSessions.length
  
  // ⭐ 통계 계산
  const completedSessionsCount = completedSessions.length
  const currentSession = completedSessionsCount + 1  // 다음 학습할 회차
  const totalSessions = Math.ceil(currentAssignment.total_words / student.session_goal)
  
  const isGenerationCompleted = currentAssignment.completed_words >= currentAssignment.total_words

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {student.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentAssignment.wordlist_name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* 학습 버튼 */}
        <Button 
          size="lg" 
          className="w-full h-14 mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <CardTitle>학습 기록</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {completedSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">아직 완성된 회차가 없습니다</p>
                <p className="text-sm mt-1">학습을 시작해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 전체 선택 + 출력 버튼들 */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b flex-wrap">
                  {/* 왼쪽: 전체 선택 */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      전체 선택
                      <span className="ml-1 text-blue-600 font-semibold">
                        ({selectedSessionsForExam.length}/{completedSessions.length})
                      </span>
                    </span>
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

                {/* 회차 목록 */}
                {completedSessions.map((session) => {
                  const knownCount = session.word_count || 0
                  const unknownCount = session.unknown_count || 0
                  
                  return (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          {/* 왼쪽: 체크박스 + 회차 정보 */}
                          <div className="flex items-center gap-3">
                            {/* 시험지 출력용 체크박스 */}
                            <Checkbox
                              checked={selectedSessionsForExam.includes(session.id)}
                              onCheckedChange={() => toggleSessionSelection(session.id)}
                            />
                            
                            <div>
                              <div className="font-semibold text-base">
                                {String(session.session_number).padStart(2, '0')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(session.completed_date).toLocaleDateString('ko-KR', { 
                                  month: 'long', 
                                  day: 'numeric'
                                })}
                              </div>
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
                                {knownCount}
                              </Button>
                              
                              {/* O-TEST 평가 상태 */}
                              <div className="min-w-[4.5rem] flex items-center justify-center">
                                {session.o_test_completed ? (
                                  // 평가 완료: 점수 표시
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-green-700 whitespace-nowrap">
                                      {session.o_test_correct}/{session.o_test_total}
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
                                      0/0
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
                                {unknownCount}
                              </Button>
                              
                              {/* X-TEST 평가 상태 */}
                              <div className="min-w-[4.5rem] flex items-center justify-center">
                                {unknownCount === 0 ? (
                                  // 모르는 단어 없음: 자동 완료 표시 (0/0)
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                                      0/0
                                    </span>
                                  </div>
                                ) : session.x_test_completed ? (
                                  // 평가 완료: 점수 표시
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                                      {session.x_test_correct}/{session.x_test_total}
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
                                      0/0
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
    </div>
  )
}

