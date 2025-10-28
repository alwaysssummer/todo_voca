'use client'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, BookCheck, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface GoalAchievedModalProps {
  open: boolean
  onClose: () => void
  completedCount: number
  goal: number
  dayNumber: number
  completedWordlistId: string
  studentToken: string
}

export function GoalAchievedModal({ 
  open, 
  onClose, 
  completedCount,
  goal,
  dayNumber,
  completedWordlistId,
  studentToken
}: GoalAchievedModalProps) {
  const router = useRouter()

  const handleStartTest = () => {
    router.push(`/s/${studentToken}/test/${completedWordlistId}`)
  }

  const handleGoToDashboard = () => {
    router.push(`/s/${studentToken}/dashboard`)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <div className="text-center space-y-6 py-6">
          {/* 축하 아이콘 */}
          <div className="flex justify-center">
            <div className="relative">
              <Trophy className="h-24 w-24 text-yellow-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 text-4xl animate-pulse">
                ✨
              </div>
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <DialogTitle className="text-3xl font-bold">목표 달성!</DialogTitle>
            <p className="text-muted-foreground">
              오늘 {completedCount}개 단어를 완료했어요
            </p>
          </div>

          {/* 통계 */}
          <div className="flex justify-center gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Day {dayNumber}
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {completedCount}/{goal}
            </Badge>
          </div>

          {/* 완성 단어장 안내 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <BookCheck className="h-4 w-4" />
              <span>Day {dayNumber} 단어장 완성</span>
            </div>
            <p className="text-xs text-muted-foreground">
              완료한 단어를 온라인 평가로 확인해보세요
            </p>
          </div>

          {/* 버튼 */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleStartTest} 
              className="w-full h-12 text-lg" 
              size="lg"
            >
              온라인 평가 시작
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              onClick={handleGoToDashboard} 
              variant="outline" 
              className="w-full"
            >
              대시보드로
            </Button>
          </div>

          {/* 추가 정보 */}
          <p className="text-xs text-muted-foreground">
            평가는 완료한 {completedCount}개 중<br />
            {Math.floor(completedCount * 0.2)}개 단어를 무작위로 출제합니다
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

