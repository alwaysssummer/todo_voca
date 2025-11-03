'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sparkles, ArrowRight, TrendingDown, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'

interface GenerationCompleteModalProps {
  open: boolean
  onClose: () => void
  currentGeneration?: number  // ⭐ Optional (사용하지 않음)
  totalWords: number  // 전체 단어 수
  skippedCount: number  // 모르는 단어 수
  nextGenerationCreated: boolean  // 복습 단어장 생성 여부
  perfectCompletion: boolean  // 학습 완료 여부
  studentToken?: string  // 대시보드 이동을 위한 토큰
}

interface ConfettiItem {
  id: number
  emoji: string
  x: number
  y: number
  delay: number
}

export function GenerationCompleteModal({
  open,
  onClose,
  currentGeneration,
  totalWords,
  skippedCount,
  nextGenerationCreated,
  perfectCompletion,
  studentToken
}: GenerationCompleteModalProps) {
  const [confetti, setConfetti] = useState<ConfettiItem[]>([])
  const [countedWords, setCountedWords] = useState(0)
  const [countedKnown, setCountedKnown] = useState(0)
  const [countedSkipped, setCountedSkipped] = useState(0)
  
  // 폭죽 효과
  useEffect(() => {
    if (!open) return
    
    const emojis = ['🎉', '✨', '🌟', '💫', '⭐', '🎊', '🎈', '🏆']
    const newConfetti = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5
    }))
    setConfetti(newConfetti)
    
    // 3초 후 제거
    const timer = setTimeout(() => setConfetti([]), 3000)
    return () => clearTimeout(timer)
  }, [open])
  
  // 숫자 카운트업 애니메이션
  useEffect(() => {
    if (!open) return
    
    const duration = 1500 // 1.5초
    const steps = 60
    const increment = {
      total: totalWords / steps,
      known: (totalWords - skippedCount) / steps,
      skipped: skippedCount / steps
    }
    
    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      if (currentStep <= steps) {
        setCountedWords(Math.min(Math.floor(increment.total * currentStep), totalWords))
        setCountedKnown(Math.min(Math.floor(increment.known * currentStep), totalWords - skippedCount))
        setCountedSkipped(Math.min(Math.floor(increment.skipped * currentStep), skippedCount))
      } else {
        clearInterval(timer)
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [open, totalWords, skippedCount])
  
  const handleConfirm = () => {
    // 학생 대시보드로 이동
    if (studentToken) {
      // sessionStorage 또는 URL 경로로 모바일 모드 판단
      const isMobile = sessionStorage.getItem('dashboardMode') === 'mobile' ||
                       window.location.pathname.includes('/mobile/')
      const dashboardPath = isMobile 
        ? `/s/${studentToken}/mobile/dashboard`
        : `/s/${studentToken}/dashboard`
      window.location.href = dashboardPath
    } else {
      window.location.reload()  // Fallback
    }
  }

  return (
    <Dialog open={open} modal={true}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden relative
                   max-sm:h-auto max-sm:max-h-[85vh] max-sm:w-[90vw]
                   max-sm:fixed max-sm:top-[50%] max-sm:left-[50%] 
                   max-sm:translate-x-[-50%] max-sm:translate-y-[-50%]
                   overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* 폭죽 효과 */}
        {confetti.map((item) => (
          <div
            key={item.id}
            className="absolute text-3xl pointer-events-none z-50"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              animation: `confetti 3s ease-out forwards`,
              animationDelay: `${item.delay}s`
            }}
          >
            {item.emoji}
          </div>
        ))}
        
        <DialogHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10 pb-4">
          <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
            {perfectCompletion ? (
              <>
                <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
                <span className="animate-pulse">학습 완료!</span>
              </>
            ) : (
              <>
                <Sparkles className="h-6 w-6 text-purple-500" style={{ animation: 'spin 3s linear infinite' }} />
                <span className="animate-pulse">단어장 학습 완료!</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {perfectCompletion ? (
            // 학습 완료 케이스
            <div 
              className="text-center space-y-4"
              style={{ animation: 'scaleIn 0.5s ease-out' }}
            >
              <div 
                className="text-8xl"
                style={{ animation: 'bounceSlow 1.5s ease-in-out infinite' }}
              >
                🎉
              </div>
              <p 
                className="text-lg font-semibold"
                style={{ animation: 'fadeInUp 0.8s ease-out 0.3s both' }}
              >
                모든 단어를 학습 완료했습니다!
              </p>
              <Card 
                className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800"
                style={{ 
                  animation: 'slideUp 0.6s ease-out 0.4s both',
                  backgroundSize: '200% 200%'
                }}
              >
                <div className="flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <Trophy 
                    className="h-5 w-5"
                    style={{ animation: 'wiggle 1s ease-in-out infinite' }}
                  />
                  <span className="font-semibold text-2xl">
                    Skip한 단어: 0개
                  </span>
                </div>
                <p className="text-xs text-center mt-2 text-muted-foreground">
                  복습이 필요한 단어가 없습니다
                </p>
              </Card>
            </div>
          ) : (
            // 복습 단어장 생성 케이스
            <>
              <div 
                className="text-center space-y-2"
                style={{ animation: 'scaleIn 0.5s ease-out' }}
              >
                <div 
                  className="text-7xl"
                  style={{ animation: 'bounceSlow 1.5s ease-in-out infinite' }}
                >
                  🎯
                </div>
                <p 
                  className="text-base text-muted-foreground"
                  style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
                >
                  이 단어장의 모든 단어를 학습했습니다
                </p>
              </div>

              {/* 학습 통계 */}
              <Card 
                className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
                style={{ animation: 'slideUp 0.6s ease-out 0.4s both' }}
              >
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">전체 단어</span>
                    <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">
                      {countedWords}개
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">알고 있는 단어</span>
                    <span className="font-bold text-2xl text-green-600 dark:text-green-400">
                      {countedKnown}개
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">모르는 단어</span>
                    <span className="font-bold text-2xl text-orange-600 dark:text-orange-400">
                      {countedSkipped}개
                    </span>
                  </div>
                </div>
              </Card>
            </>
          )}

          <Button 
            onClick={handleConfirm}
            className="w-full h-12 text-base hover:scale-105 transition-transform"
            size="lg"
            style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

