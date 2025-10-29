'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStudySession } from '@/hooks/useStudySession'
import { SkipModalMinimal } from './skip-modal-minimal'
import { SkipModalMedium } from './skip-modal-medium'
import { GoalAchievedModal } from './goal-achieved-modal'
import { GenerationCompleteModal } from './generation-complete-modal'
import { Loader2 } from 'lucide-react'

export function StudyScreen({ token }: { token: string }) {
  const {
    student,
    currentAssignment,
    currentWordlist,
    currentWord,
    completedWords,
    progress,
    pendingTest,
    loading,
    error,
    handleKnow,
    handleDontKnow,
    confirmSkip,
    fetchNextWord,
  } = useStudySession(token)

  const [skipModalOpen, setSkipModalOpen] = useState(false)
  const [skipModalType, setSkipModalType] = useState<'minimal' | 'medium'>('minimal')
  const [currentSkipCount, setCurrentSkipCount] = useState(0)
  
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [completedWordlistData, setCompletedWordlistData] = useState<any>(null)
  
  const [generationModalOpen, setGenerationModalOpen] = useState(false)
  const [generationModalData, setGenerationModalData] = useState<any>(null)

  // 중복 클릭 방지
  const [isProcessing, setIsProcessing] = useState(false)

  const onKnowClick = async () => {
    // 중복 클릭 방지
    if (isProcessing) {
      console.log('⚠️ 처리 중입니다. 잠시만 기다려주세요.')
      return
    }

    try {
      setIsProcessing(true)  // 처리 시작
      
      const result = await handleKnow()
      if (result?.goalAchieved) {
        // 완성 단어장 데이터 저장
        setCompletedWordlistData(result.completedWordlistData)
        
        // 세대 완료 체크
        if (result.generationComplete) {
          // 세대 완료 모달 데이터 저장
          setGenerationModalData({
            currentGeneration: currentAssignment?.generation || 1,
            skippedCount: result.skippedCount || 0,
            nextGenerationCreated: result.nextGenerationCreated || false,
            perfectCompletion: result.perfectCompletion || false
          })
          // 세대 완료 모달 표시
          setGenerationModalOpen(true)
        } else {
          // 일일 목표만 달성 - 축하 모달 표시
          setGoalModalOpen(true)
        }
      }
    } catch (err) {
      console.error('단어 완료 처리 오류:', err)
      alert('오류가 발생했습니다')
    } finally {
      setIsProcessing(false)  // 처리 완료
    }
  }

  const handleGoalModalClose = () => {
    setGoalModalOpen(false)
    // Day 완료 후 진행률 새로고침 + 다음 Day의 첫 단어 로드
    fetchNextWord(true)  // ⭐ forceRefresh=true로 progress 먼저 갱신
  }

  // ⭐ 페이지 로드 시 단어가 없으면 fetchNextWord 호출
  useEffect(() => {
    if (!loading && !error && !currentWord && student && currentAssignment) {
      fetchNextWord(true)
    }
  }, [loading, error, currentWord, student, currentAssignment])

  const onDontKnowClick = async () => {
    try {
      const result = await handleDontKnow()
      if (result) {
        setCurrentSkipCount(result.skipCount)
        
        // Skip 횟수에 따른 모달 타입 결정
        if (result.skipCount <= 2) {
          setSkipModalType('minimal')
        } else {
          setSkipModalType('medium')
        }
        
        setSkipModalOpen(true)
      }
    } catch (err) {
      alert('오류가 발생했습니다')
    }
  }

  const handleSkipConfirm = async () => {
    try {
      await confirmSkip()
      setSkipModalOpen(false)
    } catch (err) {
      console.error('Skip 확정 실패:', err)
      throw err
    }
  }

  const handleSkipModalClose = () => {
    setSkipModalOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md">
          <div className="text-center space-y-4">
            <div className="text-5xl">❌</div>
            <h2 className="text-xl font-bold">접근 오류</h2>
            <p className="text-muted-foreground">
              {error || '잘못된 접근입니다'}
            </p>
            <p className="text-sm text-muted-foreground">
              올바른 학습 링크로 다시 접속해주세요
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (!currentWord) {
    // ⭐ 상태 명확화: Day 완료 vs 세대 완료 vs 로딩
    const isDayComplete = progress.today >= progress.todayGoal
    const isGenerationComplete = progress.generationCompleted >= progress.generationTotal

    // 1. Day 완료 (오늘의 목표 달성)
    if (isDayComplete) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Day {progress.day} 완료!</h2>
            <p className="text-muted-foreground">
              오늘의 학습 목표를 달성했습니다
            </p>
            <div className="pt-2">
              <Badge variant="outline" className="text-base px-4 py-2">
                완료: {progress.today}/{progress.todayGoal}
              </Badge>
            </div>

            {/* 버튼 그룹 */}
            <div className="space-y-3">
              {pendingTest.hasPendingTest && pendingTest.pendingTestId && (
                <Button 
                  onClick={() => window.location.href = `/s/${token}/test/${pendingTest.pendingTestId}`}
                  className="w-full"
                  size="lg"
                >
                  🎯 평가 시작하기
                </Button>
              )}
              
              <Button 
                onClick={() => window.location.href = `/s/${token}/dashboard`}
                variant={pendingTest.hasPendingTest ? "outline" : "default"}
                className="w-full"
                size="lg"
              >
                📊 대시보드로
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    // 2. 세대 완료 (모든 단어 완료)
    if (isGenerationComplete) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center space-y-6">
            <div className="text-6xl">🎊</div>
            <h2 className="text-2xl font-bold">세대 학습 완료!</h2>
            <p className="text-muted-foreground">
              {currentAssignment?.generation}차 단어장을 모두 완료했습니다
            </p>
            <div className="pt-2">
              <Badge variant="outline" className="text-base px-4 py-2">
                완료: {progress.generationCompleted}/{progress.generationTotal}
              </Badge>
            </div>

            <Button 
              onClick={() => window.location.href = `/s/${token}/dashboard`}
              className="w-full"
              size="lg"
            >
              📊 대시보드로
            </Button>
          </Card>
        </div>
      )
    }

    // 3. 로딩 또는 기타 상태
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">다음 단어 준비 중...</p>
        </Card>
      </div>
    )
  }

  const progressPercentage = (progress.today / progress.todayGoal) * 100
  const generationProgressPercentage = (progress.generationCompleted / progress.generationTotal) * 100

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="min-h-24 border-b px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{student.name}</h2>
            <Badge variant="outline">Day {progress.day}</Badge>
            {currentAssignment && (
              <Badge 
                variant={currentAssignment.generation === 1 ? "default" : "secondary"} 
                className={currentAssignment.generation > 1 ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100" : ""}
              >
                {currentAssignment.generation}차
              </Badge>
            )}
          </div>
          {currentWordlist && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-medium">{currentWordlist.name}</span>
              {currentAssignment && currentAssignment.filtered_word_ids && (
                <Badge variant="outline" className="text-xs py-0">
                  복습 {currentAssignment.filtered_word_ids.length}개
                </Badge>
              )}
              <span className="text-muted-foreground/70">
                · 세대 진행률: {progress.generationCompleted}/{progress.generationTotal} ({generationProgressPercentage.toFixed(0)}%)
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">오늘 목표</div>
            <div className="text-2xl font-bold">
              {progress.today}
              <span className="text-muted-foreground text-base font-normal">
                /{progress.todayGoal}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {progressPercentage.toFixed(0)}% 완료
            </div>
          </div>
        </div>
      </header>

      {/* 현재 단어 */}
      <section className="h-1/3 flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-background to-muted/20 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight animate-in fade-in zoom-in duration-300">
            {currentWord.word_text}
          </h1>
        </div>
        <div className="flex gap-4">
          <Button 
            size="lg" 
            onClick={onKnowClick}
            disabled={isProcessing}
            className="min-w-[120px] text-lg h-14"
          >
            {isProcessing ? '처리 중...' : '안다'}
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={onDontKnowClick}
            className="min-w-[120px] text-lg h-14"
          >
            모른다
          </Button>
        </div>
      </section>

      {/* 완료 목록 */}
      <section className="h-2/3 border-t bg-muted/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              오늘 완료한 단어
            </p>
            <Badge variant="secondary" className="text-sm">
              {completedWords.length}개
            </Badge>
          </div>
          <ScrollArea className="h-[calc(66vh-8rem)]">
            <div className="space-y-2">
              {completedWords.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    단어를 완료하면 여기에 표시됩니다
                  </p>
                </Card>
              ) : (
                completedWords.map((word, idx) => (
                  <Card 
                    key={`${word.id}-${idx}`}
                    className="p-4 hover:bg-accent/50 transition-all hover:shadow-md animate-in slide-in-from-top duration-200"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-medium min-w-[2ch]">
                          {completedWords.length - idx}.
                        </span>
                        <span className="font-semibold text-lg">
                          {word.word_text}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          - {word.meaning}
                        </span>
                      </div>
                      {idx === 0 && (
                        <span className="text-2xl animate-bounce">✨</span>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </section>

      {/* Skip 모달 */}
      {currentWord && (
        <>
          {skipModalType === 'minimal' && (
            <SkipModalMinimal
              word={currentWord}
              skipCount={currentSkipCount}
              open={skipModalOpen}
              onClose={handleSkipModalClose}
              onSkip={handleSkipConfirm}
            />
          )}
          
          {skipModalType === 'medium' && (
            <SkipModalMedium
              word={currentWord}
              skipCount={currentSkipCount}
              open={skipModalOpen}
              onClose={handleSkipModalClose}
              onSkip={handleSkipConfirm}
            />
          )}
        </>
      )}

      {/* 목표 달성 축하 모달 */}
      {completedWordlistData && (
        <GoalAchievedModal
          open={goalModalOpen}
          onClose={handleGoalModalClose}
          completedCount={progress.today}
          goal={progress.todayGoal}
          dayNumber={completedWordlistData?.dayNumber || progress.day}
          completedWordlistId={completedWordlistData?.completedWordlistId || ''}
          studentToken={token}
        />
      )}

      {/* 세대 완료 모달 */}
      {generationModalData && (
        <GenerationCompleteModal
          open={generationModalOpen}
          onClose={() => setGenerationModalOpen(false)}
          currentGeneration={generationModalData.currentGeneration}
          skippedCount={generationModalData.skippedCount}
          nextGenerationCreated={generationModalData.nextGenerationCreated}
          perfectCompletion={generationModalData.perfectCompletion}
        />
      )}
    </div>
  )
}

