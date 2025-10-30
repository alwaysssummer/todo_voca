'use client'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, ArrowRight } from "lucide-react"
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
              {dayNumber}회차
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {completedCount}/{goal}
            </Badge>
          </div>

          {/* 버튼 */}
          <div className="pt-2">
            <Button 
              onClick={handleGoToDashboard} 
              className="w-full h-12 text-lg" 
              size="lg"
            >
              대시보드로
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

