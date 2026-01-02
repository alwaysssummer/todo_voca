'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Volume2 } from "lucide-react"
import { useState } from "react"
import type { Word } from "@/types/word"

interface SkipModalMinimalProps {
  word: Word
  skipCount: number
  open: boolean
  onClose: () => void
  onSkip: () => Promise<void>
}

export function SkipModalMinimal({ 
  word, 
  skipCount,
  open, 
  onClose,
  onSkip 
}: SkipModalMinimalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)

  const handlePlayAudio = async () => {
    if (!word.audio_url) return
    
    const audio = new Audio(word.audio_url)
    setIsPlaying(true)
    
    try {
      await audio.play()
      audio.onended = () => setIsPlaying(false)
    } catch (error) {
      setIsPlaying(false)
      console.error('Audio playback failed:', error)
      alert('발음을 재생할 수 없습니다. 브라우저 설정을 확인해주세요.')
    }
    
    audio.onerror = () => {
      setIsPlaying(false)
      alert('오디오 파일을 불러올 수 없습니다')
    }
  }

  const handleSkipToTomorrow = async () => {
    setIsSkipping(true)
    try {
      await onSkip()
      onClose()
    } catch (err) {
      console.error('Skip 처리 실패:', err)
      alert('오류가 발생했습니다')
    } finally {
      setIsSkipping(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // 모달이 닫히는 경우(외부 클릭) 무시 - 오직 "내일 다시" 버튼으로만 닫힘
      if (!isOpen) return
      onClose()
    }}>
      <DialogContent className="sm:max-w-[320px] [&>button[class*='absolute']]:hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            {word.word_text}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* 뜻 */}
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <p className="text-lg pt-1 leading-relaxed">{word.meaning}</p>
          </div>

          {/* 발음 버튼 */}
          {word.audio_url && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePlayAudio}
              disabled={isPlaying}
            >
              <Volume2 className="mr-2 h-4 w-4" />
              {isPlaying ? '재생 중...' : '발음'}
            </Button>
          )}

          {/* Skip 횟수 표시 */}
          <div className="text-center text-sm text-muted-foreground">
            {skipCount}번째 건너뛰기
          </div>
        </div>

        {/* 내일 다시 버튼 */}
        <Button 
          onClick={handleSkipToTomorrow} 
          className="w-full"
          disabled={isSkipping}
        >
          {isSkipping ? '처리 중...' : '내일 다시'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

