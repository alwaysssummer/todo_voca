'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStudySession } from '@/hooks/useStudySession'
import { SkipModalMinimal } from './skip-modal-minimal'
import { SkipModalMedium } from './skip-modal-medium'
import { GoalAchievedModal } from './goal-achieved-modal'
import { GenerationCompleteModal } from './generation-complete-modal'
import { Loader2 } from 'lucide-react'
import type { Word } from '@/types/word'

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
    showGenerationCompleteModal,
    setShowGenerationCompleteModal,
    generationModalData,
    setGenerationModalData
  } = useStudySession(token)

  const [skipModalOpen, setSkipModalOpen] = useState(false)
  const [skipModalType, setSkipModalType] = useState<'minimal' | 'medium'>('minimal')
  const [currentSkipCount, setCurrentSkipCount] = useState(0)
  
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [completedWordlistData, setCompletedWordlistData] = useState<any>(null)

  // 중복 클릭 방지
  const [isProcessing, setIsProcessing] = useState(false)

  // "모른다" 강조 화면 상태
  const [showDontKnowScreen, setShowDontKnowScreen] = useState(false)
  const [dontKnowCountdown, setDontKnowCountdown] = useState(3)
  const [dontKnowWord, setDontKnowWord] = useState<Word | null>(null)
  
  // 🆕 Phase 1-1: 타이머 메모리 관리
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const remainingTimeRef = useRef<number>(3000) // 남은 시간 (밀리초)
  
  // 🆕 Phase 1-2: 일시정지/재개 상태
  const [isPaused, setIsPaused] = useState(false)
  
  // 🆕 Phase 2-1: 클릭 쿨다운 (빠른 연속 클릭 방지)
  const [clickCooldown, setClickCooldown] = useState(false)
  
  // 🆕 Phase 1-1: 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        console.log('🧹 [Cleanup] 카운트다운 타이머 정리')
      }
      if (autoProgressTimeoutRef.current) {
        clearTimeout(autoProgressTimeoutRef.current)
        console.log('🧹 [Cleanup] 자동진행 타이머 정리')
      }
    }
  }, [])

  // 🆕 Phase 2-2: 모달 충돌 감지 (목표 달성 or 단어장 완료 시 타이머 정리)
  useEffect(() => {
    if (goalModalOpen || showGenerationCompleteModal) {
      console.log('🚨 [모달 충돌 감지] 타이머 강제 정리')
      
      // 모든 타이머 정리
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      if (autoProgressTimeoutRef.current) {
        clearTimeout(autoProgressTimeoutRef.current)
        autoProgressTimeoutRef.current = null
      }
      
      // 상태 초기화
      setShowDontKnowScreen(false)
      setDontKnowWord(null)
      setIsPaused(false)
    }
  }, [goalModalOpen, showGenerationCompleteModal])

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
        
        // 단어장 전체 완료 체크
        if (result.generationComplete) {
          // 단어장 완료 모달 데이터 저장
          setGenerationModalData({
            currentGeneration: currentAssignment?.generation || 1,
            skippedCount: result.skippedCount || 0,
            nextGenerationCreated: result.nextGenerationCreated || false,
            perfectCompletion: result.perfectCompletion || false
          })
          // ⭐ 단어장 완료 시에도 일단 "목표 달성!" 모달 먼저 표시
          setGoalModalOpen(true)
        } else {
          // 일일 목표만 달성 - "목표 달성!" 모달 표시
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
    
    // ⭐ 단어장 전체 완료인 경우, "단어장 학습 완료!" 모달을 이어서 표시
    if (generationModalData) {
      setShowGenerationCompleteModal(true)
    }
    // 일일 목표만 완료한 경우, 다음 단어 로드는 handleKnow에서 이미 처리됨
  }

  // 🆕 Phase 1-3: 일시정지/재개 토글 함수 (Phase 2-1: 개선)
  const togglePause = () => {
    // 🔒 Phase 2-1: 화면 상태 체크
    if (!showDontKnowScreen) {
      console.log('⚠️ [togglePause] 강조 화면이 아닙니다. 무시합니다.')
      return
    }
    
    // 🔒 Phase 2-1: 처리 중 체크
    if (isProcessing) {
      console.log('⚠️ [togglePause] 아직 준비 중입니다. 잠시만 기다려주세요.')
      return
    }
    
    // 🔒 Phase 2-1: 클릭 쿨다운 체크 (300ms)
    if (clickCooldown) {
      console.log('⚠️ [togglePause] 너무 빠른 클릭입니다.')
      return
    }
    
    setClickCooldown(true)
    setTimeout(() => setClickCooldown(false), 300)
    
    // 🔒 Phase 1-3: 항상 기존 타이머 정리 먼저 (중복 방지)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (autoProgressTimeoutRef.current) {
      clearTimeout(autoProgressTimeoutRef.current)
      autoProgressTimeoutRef.current = null
    }
    
    const newPaused = !isPaused
    setIsPaused(newPaused)
    
    if (newPaused) {
      // 일시정지
      remainingTimeRef.current = dontKnowCountdown * 1000
      console.log('⏸️ [일시정지] 남은 시간:', remainingTimeRef.current + 'ms')
      
      // 🔒 Phase 2-2: 0초 이하 체크
      if (remainingTimeRef.current <= 0) {
        console.log('⚠️ [일시정지] 이미 완료되었습니다. 다음 단어로 이동합니다.')
        setShowDontKnowScreen(false)
        setDontKnowWord(null)
        setIsPaused(false)
        fetchNextWord()
        return
      }
    } else {
      // 재개
      console.log('▶️ [재개] 남은 시간:', remainingTimeRef.current + 'ms')
      
      // 카운트다운 재시작
      let countdown = Math.ceil(remainingTimeRef.current / 1000)
      countdownIntervalRef.current = setInterval(() => {
        remainingTimeRef.current -= 1000
        countdown = Math.ceil(remainingTimeRef.current / 1000)
        setDontKnowCountdown(Math.max(0, countdown))
        console.log('🔴 [카운트다운 재개]:', countdown)
        
        if (countdown <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
        }
      }, 1000)
      
      // 자동 진행 타이머 재시작 (남은 시간만큼)
      autoProgressTimeoutRef.current = setTimeout(async () => {
        console.log('🔴 [자동 진행] 강조 화면 숨김, 다음 단어 로드')
        setShowDontKnowScreen(false)
        setDontKnowWord(null)
        setIsPaused(false)
        await fetchNextWord()
      }, remainingTimeRef.current)
    }
  }

  const onDontKnowClick = async () => {
    if (!currentWord) return
    
    try {
      console.log('🔴 [모른다 클릭] 시작:', currentWord.word_text)
      
      // 현재 단어를 저장 (강조 화면에서 표시할 단어)
      setDontKnowWord(currentWord)
      
      // 1. DB에 "모른다" 상태 저장
      console.log('🔴 [모른다 클릭] handleDontKnow 호출...')
      const result = await handleDontKnow()
      console.log('🔴 [모른다 클릭] handleDontKnow 완료:', result)
      
      if (result) {
        setCurrentSkipCount(result.skipCount)
        
        // 🆕 Phase 1-4: 초기화
        setShowDontKnowScreen(true)
        setDontKnowCountdown(3)
        setIsPaused(false) // 일시정지 해제
        remainingTimeRef.current = 3000 // 3초로 리셋
        console.log('🔴 [모른다 클릭] 강조 화면 표시 시작')
        
        // 🆕 Phase 1-4: ref 기반 타이머 시작
        let countdown = 3
        countdownIntervalRef.current = setInterval(() => {
          countdown -= 1
          remainingTimeRef.current = countdown * 1000
          setDontKnowCountdown(countdown)
          console.log('🔴 [카운트다운]:', countdown)
          if (countdown <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
            }
          }
        }, 1000)
        
        // 🆕 Phase 1-4: ref 기반 자동 진행 타이머
        autoProgressTimeoutRef.current = setTimeout(async () => {
          console.log('🔴 [3초 후] 강조 화면 숨김, 다음 단어 로드 시작')
          setShowDontKnowScreen(false)
          setDontKnowWord(null)
          setIsPaused(false)
          // 다음 단어 로드
          console.log('🔴 [3초 후] fetchNextWord 호출...')
          await fetchNextWord()
          console.log('🔴 [3초 후] fetchNextWord 완료!')
        }, 3000)
      }
    } catch (err) {
      console.error('🔴 [모른다 처리 오류]:', err)
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
    // ⭐ 상태 명확화: 일일 목표 완료 vs 단어장 전체 완료 vs 로딩
    const isSessionComplete = progress.today >= progress.todayGoal
    const isWordlistComplete = progress.generationCompleted >= progress.generationTotal

    // ⭐⭐⭐ 단어장 학습 완료 모달이 표시 중이면 빈 화면 + 모달 표시
    if (showGenerationCompleteModal) {
      return (
        <div className="h-screen">
          {/* 단어장 학습 완료 모달 */}
          {generationModalData && currentWordlist && (
            <GenerationCompleteModal
              open={showGenerationCompleteModal}
              onClose={() => setShowGenerationCompleteModal(false)}
              totalWords={currentWordlist.total_words}
              skippedCount={generationModalData.skippedCount}
              nextGenerationCreated={generationModalData.nextGenerationCreated}
              perfectCompletion={generationModalData.perfectCompletion}
              studentToken={token}
            />
          )}
        </div>
      )
    }
    
    // 1. 회차 완료 (오늘의 목표 달성)
    if (isSessionComplete) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">{progress.session}회차 완료!</h2>
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
                onClick={() => {
                  // sessionStorage 또는 URL 경로로 모바일 모드 판단
                  const isMobile = sessionStorage.getItem('dashboardMode') === 'mobile' ||
                                   window.location.pathname.includes('/mobile/')
                  const dashboardPath = isMobile 
                    ? `/s/${token}/mobile/dashboard`
                    : `/s/${token}/dashboard`
                  window.location.href = dashboardPath
                }}
                variant={pendingTest.hasPendingTest ? "outline" : "default"}
                className="w-full"
                size="lg"
              >
                확인
              </Button>
            </div>
          </Card>
        </div>
      )
    }
    
    // 2. 단어장 전체 완료 (모든 단어 학습 완료)
    if (isWordlistComplete) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center space-y-6">
            <div className="text-6xl">🎊</div>
            <h2 className="text-2xl font-bold">단어장 학습 완료!</h2>
            <p className="text-muted-foreground">
              이 단어장의 모든 단어를 완료했습니다
            </p>
            <div className="pt-2">
              <Badge variant="outline" className="text-base px-4 py-2">
                완료: {progress.generationCompleted}/{progress.generationTotal}
              </Badge>
            </div>

            <Button 
              onClick={() => {
                // sessionStorage 또는 URL 경로로 모바일 모드 판단
                const isMobile = sessionStorage.getItem('dashboardMode') === 'mobile' ||
                                 window.location.pathname.includes('/mobile/')
                const dashboardPath = isMobile 
                  ? `/s/${token}/mobile/dashboard`
                  : `/s/${token}/dashboard`
                window.location.href = dashboardPath
              }}
              className="w-full"
              size="lg"
            >
              확인
            </Button>
          </Card>
        </div>
      )
    }
    
    // 3. 로딩 (정상적인 다음 단어 대기 중)
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
      {/* 1. 학습 단어 영역 - 화면의 30% */}
      <section className="h-[30vh] flex items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
        <div className="text-center max-w-full px-4">
          <h1 
            className={`font-bold tracking-tight animate-in fade-in zoom-in duration-300 break-words text-center ${
              currentWord.word_text.length <= 6 
                ? 'text-5xl sm:text-6xl md:text-7xl'
                : currentWord.word_text.length <= 12
                ? 'text-4xl sm:text-5xl md:text-6xl'
                : currentWord.word_text.length <= 18
                ? 'text-3xl sm:text-4xl md:text-5xl'
                : 'text-2xl sm:text-3xl md:text-4xl'
            }`}
          >
            {currentWord.word_text}
          </h1>
        </div>
      </section>

      {/* 2. 버튼 영역 - 화면의 20% (골드존) */}
      <div className="h-[20vh] flex items-center justify-center px-4">
        <div className="flex gap-4">
          <Button 
            size="lg" 
            onClick={onKnowClick}
            disabled={isProcessing}
            className="min-w-[120px] text-lg h-14 shadow-lg"
          >
            {isProcessing ? '처리 중...' : '안다'}
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={onDontKnowClick}
            className="min-w-[120px] text-lg h-14 shadow-lg bg-white"
          >
            모른다
          </Button>
        </div>
      </div>

      {/* 3. 완료 목록 영역 - 화면의 50% */}
      <section className="h-[50vh] border-t bg-muted/10">
        <div className="p-3 h-full">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {completedWords.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    단어를 완료하면 여기에 표시됩니다
                  </p>
                </Card>
              ) : (
                completedWords.map((word, idx) => (
                  <Card 
                    key={`${word.id}-${idx}`}
                    className="p-2 hover:bg-accent/50 transition-all hover:shadow-md animate-in slide-in-from-top duration-200"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium min-w-[2ch] text-sm">
                          {completedWords.length - idx}.
                        </span>
                        <span className="font-semibold text-base">
                          {word.word_text}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          - {word.meaning}
                        </span>
                      </div>
                      {idx === 0 && (
                        <span className="text-xl animate-bounce">✨</span>
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
      {completedWordlistData && student && (
        <GoalAchievedModal
          open={goalModalOpen}
          onClose={handleGoalModalClose}
          completedCount={progress.today}
          goal={progress.todayGoal}
          dayNumber={completedWordlistData?.sessionNumber || progress.session}
          completedWordlistId={completedWordlistData?.completedWordlistId || ''}
          studentToken={token}
          totalSessions={student.session_goal > 0 ? Math.ceil(progress.generationTotal / student.session_goal) : undefined}
        />
      )}

      {/* 단어장 학습 완료 모달 */}
      {generationModalData && currentWordlist && (
        <GenerationCompleteModal
          open={showGenerationCompleteModal}
          onClose={() => setShowGenerationCompleteModal(false)}
          totalWords={currentWordlist.total_words}
          skippedCount={generationModalData.skippedCount}
          nextGenerationCreated={generationModalData.nextGenerationCreated}
          perfectCompletion={generationModalData.perfectCompletion}
          studentToken={token}
        />
      )}

      {/* "모른다" 강조 화면 - 동적 글자 크기 + 최종 미니멀 버전 */}
      {showDontKnowScreen && dontKnowWord && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
        >
          <Card 
            className="max-w-2xl w-full border-4 border-red-500 shadow-2xl cursor-pointer 
                       max-h-[90vh] overflow-y-auto"
            onClick={togglePause}
          >
            <CardContent className="p-6 sm:p-12 text-center space-y-4 sm:space-y-6">
              {/* 단어 (동적 크기 조정) */}
              <div 
                className={`font-bold text-gray-900 break-words ${
                  dontKnowWord.word_text.length <= 6 
                    ? 'text-5xl sm:text-6xl md:text-7xl'  // 짧은 단어 (예: apple)
                    : dontKnowWord.word_text.length <= 12
                    ? 'text-4xl sm:text-5xl md:text-6xl'  // 중간 단어 (예: individual)
                    : dontKnowWord.word_text.length <= 18
                    ? 'text-3xl sm:text-4xl md:text-5xl'  // 긴 단어 (예: accommodation)
                    : 'text-2xl sm:text-3xl md:text-4xl'  // 매우 긴 단어
                }`}
              >
                {dontKnowWord.word_text}
              </div>
              
              {/* 뜻 (동적 크기 조정) */}
              <div 
                className={`text-red-600 font-semibold break-words ${
                  dontKnowWord.meaning.length <= 10
                    ? 'text-2xl sm:text-3xl md:text-4xl'  // 짧은 뜻 (예: 사과)
                    : dontKnowWord.meaning.length <= 20
                    ? 'text-xl sm:text-2xl md:text-3xl'   // 중간 뜻 (예: 개인, 개인의, 개인적인)
                    : dontKnowWord.meaning.length <= 30
                    ? 'text-lg sm:text-xl md:text-2xl'    // 긴 뜻
                    : 'text-base sm:text-lg md:text-xl'   // 매우 긴 뜻
                }`}
              >
                {dontKnowWord.meaning}
              </div>
              
              {/* 연상암기 - 어원/연상 구분 (심플 회색 버전) */}
              {dontKnowWord.mnemonic && (
                <div className="pt-3 border-t-2 border-gray-200 space-y-2">
                  {/* 어원 - 회색 박스 */}
                  {dontKnowWord.mnemonic.includes('어원:') && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                      <p 
                        className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words text-left"
                        dangerouslySetInnerHTML={{
                          __html: dontKnowWord.mnemonic
                            .split('연상:')[0]
                            .replace('어원:', '')
                            .trim()
                            // 괄호 앞 단어를 굵게
                            .replace(/([a-zA-Z가-힣]+)\(/g, '<strong>$1</strong>(')
                            // 작은따옴표 안 단어를 굵게
                            .replace(/'([^']+)'/g, '<strong>\'$1\'</strong>')
                        }}
                      />
                    </div>
                  )}
                  
                  {/* 연상 - 회색 박스 */}
                  {dontKnowWord.mnemonic.includes('연상:') && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                      <p 
                        className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words text-left"
                        dangerouslySetInnerHTML={{
                          __html: (dontKnowWord.mnemonic.split('연상:')[1]?.trim() || dontKnowWord.mnemonic)
                            // 작은따옴표 안 단어를 굵게
                            .replace(/'([^']+)'/g, '<strong>\'$1\'</strong>')
                            // 괄호 앞 단어를 굵게
                            .replace(/([a-zA-Z가-힣]+)\(/g, '<strong>$1</strong>(')
                        }}
                      />
                    </div>
                  )}
                  
                  {/* 구분 없는 경우 (기존 단어장 호환) */}
                  {!dontKnowWord.mnemonic.includes('어원:') && !dontKnowWord.mnemonic.includes('연상:') && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                      <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words text-left">
                        {dontKnowWord.mnemonic}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* 일시정지 표시 (간단하게) */}
              {isPaused && (
                <div className="text-base sm:text-lg text-gray-600 font-semibold py-2">
                  ⏸️ 일시정지
                </div>
              )}
              
              {/* 프로그레스 바만 표시 (숫자 제거) */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all"
                  style={{ 
                    width: `${((3 - dontKnowCountdown) / 3) * 100}%`,
                    transitionDuration: isPaused ? '0ms' : '1000ms',
                    transitionTimingFunction: 'linear'
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

