'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Word {
  id: string
  word_text: string
  meaning: string
}

interface TestResultModalProps {
  open: boolean
  onClose: () => void
  sessionNumber: number
  testType: 'known' | 'unknown'
  wrongWordIds: number[] | null
}

export function TestResultModal({
  open,
  onClose,
  sessionNumber,
  testType,
  wrongWordIds
}: TestResultModalProps) {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !wrongWordIds || wrongWordIds.length === 0) {
      setWords([])
      setLoading(false)
      return
    }

    async function loadWords() {
      try {
        setLoading(true)

        // wrongWordIds는 이미 상단에서 null 체크됨
        const { data, error } = await supabase
          .from('words')
          .select('id, word_text, meaning')
          .in('id', wrongWordIds!)  // non-null assertion

        if (error) throw error

        setWords(data || [])
      } catch (err) {
        console.error('틀린 단어 로드 실패:', err)
        setWords([])
      } finally {
        setLoading(false)
      }
    }

    loadWords()
  }, [open, wrongWordIds])

  const testTitle = testType === 'known' ? 'O-TEST' : 'X-TEST'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {testTitle} 결과 ({sessionNumber}회차)
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              로딩 중...
            </div>
          ) : words.length === 0 ? (
            <div className="text-center py-8">
              🎉 모두 정답입니다!
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {words.map((word, index) => (
                <div key={word.id} className="text-sm">
                  {index + 1}. {word.word_text} : {word.meaning}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

