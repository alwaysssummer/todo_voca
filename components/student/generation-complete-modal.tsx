'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sparkles, ArrowRight, TrendingDown, Trophy } from 'lucide-react'

interface GenerationCompleteModalProps {
  open: boolean
  onClose: () => void
  currentGeneration?: number  // ⭐ Optional (사용하지 않음)
  totalWords: number  // 전체 단어 수
  skippedCount: number  // 모르는 단어 수
  nextGenerationCreated: boolean  // 복습 단어장 생성 여부
  perfectCompletion: boolean  // 완벽 암기 여부
  studentToken?: string  // 대시보드 이동을 위한 토큰
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
  
  const handleConfirm = () => {
    // 학생 대시보드로 이동
    if (studentToken) {
      // 현재 URL에 /mobile/이 포함되어 있으면 모바일 대시보드로, 아니면 데스크 대시보드로
      const isMobile = window.location.pathname.includes('/mobile/')
      const dashboardPath = isMobile 
        ? `/s/${studentToken}/mobile/dashboard`
        : `/s/${studentToken}/dashboard`
      window.location.href = dashboardPath
    } else {
      window.location.reload()  // Fallback
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
            {perfectCompletion ? (
              <>
                <Trophy className="h-6 w-6 text-yellow-500" />
                완벽 암기 완료!
              </>
            ) : (
              <>
                <Sparkles className="h-6 w-6 text-purple-500" />
                단어장 학습 완료!
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {perfectCompletion ? (
            // 완벽 암기 케이스
            <>
              <div className="text-center space-y-4">
                <div className="text-6xl">🎉</div>
                <p className="text-lg font-semibold">
                  모든 단어를 완벽하게 암기했습니다!
                </p>
                <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-300">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold">
                      Skip한 단어: 0개
                    </span>
                  </div>
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    복습이 필요한 단어가 없습니다
                  </p>
                </Card>
              </div>
            </>
          ) : (
            // 복습 단어장 생성 케이스
            <>
              <div className="text-center space-y-2">
                <div className="text-5xl">🎯</div>
                <p className="text-base text-muted-foreground">
                  이 단어장의 모든 단어를 학습했습니다
                </p>
              </div>

              {/* 학습 통계 */}
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">전체 단어</span>
                    <span className="font-semibold text-base">{totalWords}개</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">알고 있는 단어</span>
                    <span className="font-semibold text-base text-green-600 dark:text-green-400">{totalWords - skippedCount}개</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">모르는 단어</span>
                    <span className="font-semibold text-base text-orange-600 dark:text-orange-400">{skippedCount}개</span>
                  </div>
                </div>
              </Card>
            </>
          )}

          <Button 
            onClick={handleConfirm}
            className="w-full h-12 text-base"
            size="lg"
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

