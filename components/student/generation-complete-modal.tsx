'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sparkles, ArrowRight, TrendingDown, Trophy } from 'lucide-react'

interface GenerationCompleteModalProps {
  open: boolean
  onClose: () => void
  currentGeneration: number
  skippedCount: number
  nextGenerationCreated: boolean
  perfectCompletion: boolean
}

export function GenerationCompleteModal({
  open,
  onClose,
  currentGeneration,
  skippedCount,
  nextGenerationCreated,
  perfectCompletion
}: GenerationCompleteModalProps) {
  
  const handleConfirm = () => {
    // 페이지 새로고침으로 다음 세대 로드
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
                {currentGeneration}차 단어장 완료!
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
            // 다음 세대 생성 케이스
            <>
              <div className="text-center space-y-2">
                <div className="text-5xl">🎯</div>
                <p className="text-base text-muted-foreground">
                  {currentGeneration}차 단어장의 모든 단어를 학습했습니다
                </p>
              </div>

              <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">현재 세대</span>
                    <Badge variant="outline" className="bg-white dark:bg-slate-800">
                      {currentGeneration}차
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center gap-3 py-2">
                    <ArrowRight className="h-5 w-5 text-purple-500 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">다음 세대</span>
                    <Badge className="bg-purple-600 dark:bg-purple-500">
                      {currentGeneration + 1}차
                    </Badge>
                  </div>
                </div>
              </Card>

              {nextGenerationCreated && (
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-1">
                        복습이 필요한 단어: {skippedCount}개
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Skip한 단어만 모아서 {currentGeneration + 1}차 단어장을 자동으로 생성했습니다
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          <Button 
            onClick={handleConfirm}
            className="w-full h-12 text-base"
            size="lg"
          >
            {perfectCompletion ? '확인' : `${currentGeneration + 1}차 단어장 시작하기`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

