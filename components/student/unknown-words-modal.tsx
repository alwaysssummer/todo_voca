'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Word {
  word_text: string
  meaning: string
}

interface UnknownWordsModalProps {
  open: boolean
  onClose: () => void
  sessionId: string
  sessionNumber: number
  unknownCount: number
}

export function UnknownWordsModal({
  open,
  onClose,
  sessionId,
  sessionNumber,
  unknownCount
}: UnknownWordsModalProps) {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && sessionId) {
      loadWords()
    }
  }, [open, sessionId])

  const loadWords = async () => {
    setLoading(true)
    try {
      // 1. unknown_word_ids 가져오기
      const { data: session } = await supabase
        .from('completed_wordlists')
        .select('unknown_word_ids')
        .eq('id', sessionId)
        .single()

      if (session?.unknown_word_ids && session.unknown_word_ids.length > 0) {
        // 2. 단어 정보 가져오기
        const { data: wordData } = await supabase
          .from('words')
          .select('word_text, meaning, sequence_order')
          .in('id', session.unknown_word_ids)
          .order('sequence_order')

        setWords(wordData || [])
      }
    } catch (error) {
      console.error('단어 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full">
        <DialogHeader className="print:mb-8">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {sessionNumber}회차 - 모르는 단어 ({unknownCount}개)
            </DialogTitle>
            {/* 인쇄 버튼 (인쇄 시 숨김) */}
            <Button 
              onClick={handlePrint}
              className="gap-2 print:hidden"
              variant="outline"
            >
              <Printer className="w-4 h-4" />
              인쇄하기
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            단어가 없습니다
          </div>
        ) : (
          /* 2단 리스트 */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4 print:gap-y-3">
            {words.map((word, index) => (
              <div key={index} className="flex gap-2 text-base">
                <span className="font-medium">{word.word_text}</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-muted-foreground">{word.meaning}</span>
              </div>
            ))}
          </div>
        )}

        {/* 인쇄 스타일 */}
        <style jsx global>{`
          @media print {
            /* 모달 배경/오버레이 제거 */
            body * { visibility: hidden; }
            [role="dialog"], [role="dialog"] * { visibility: visible; }
            [role="dialog"] { 
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              box-shadow: none;
              border: none;
            }
            /* A4 페이지 설정 */
            @page { 
              size: A4; 
              margin: 2cm; 
            }
            /* 닫기 버튼 숨김 */
            button[aria-label="Close"] { display: none !important; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}

