'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Volume2 } from "lucide-react"
import { useState } from "react"
import type { Word } from "@/types/word"

interface SkipModalMediumProps {
  word: Word
  skipCount: number
  open: boolean
  onClose: () => void
  onSkip: () => Promise<void>
}

export function SkipModalMedium({ 
  word, 
  skipCount,
  open, 
  onClose,
  onSkip 
}: SkipModalMediumProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)

  const handlePlayAudio = () => {
    if (!word.audio_url) return
    
    const audio = new Audio(word.audio_url)
    setIsPlaying(true)
    audio.play()
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => {
      setIsPlaying(false)
      alert('발음을 재생할 수 없습니다')
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
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] [&>button[class*='absolute']]:hidden">
        <DialogHeader>
          <DialogTitle className="text-4xl font-bold">
            {word.word_text}
          </DialogTitle>
        </DialogHeader>

        {/* 경고 배너 */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {skipCount}번 건너뛰었어요!
          </AlertDescription>
        </Alert>

        {/* 상세 정보 스크롤 영역 */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-6 py-4 pr-4">
            {/* 뜻 */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span>💡</span> 뜻
              </h4>
              <p className="text-lg leading-relaxed">{word.meaning}</p>
            </div>

            {/* 예문 */}
            {word.example && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span>📖</span> 예문
                </h4>
                <div className="space-y-2">
                  <p className="text-muted-foreground italic bg-muted p-3 rounded-md">
                    {word.example}
                  </p>
                  {word.example_translation && (
                    <p className="text-sm">{word.example_translation}</p>
                  )}
                </div>
              </div>
            )}

            {/* 연상법 */}
            {word.mnemonic && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span>🧠</span> 연상법
                </h4>
                <p className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  {word.mnemonic}
                </p>
              </div>
            )}

            {/* 발음 */}
            {word.audio_url && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handlePlayAudio}
                disabled={isPlaying}
              >
                <Volume2 className="mr-2 h-4 w-4" />
                {isPlaying ? '재생 중...' : '발음 듣기'}
              </Button>
            )}
          </div>
        </ScrollArea>

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

