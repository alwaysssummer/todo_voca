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
            <DialogTitle className="text-xl print:text-2xl">
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
          <div className="flex items-center justify-center py-12 print:hidden">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground print:hidden">
            단어가 없습니다
          </div>
        ) : (
          /* 2단 컬럼 레이아웃 (좌측 먼저 채우기) */
          <div className="word-list columns-1 md:columns-2 gap-8 py-4 print:columns-2">
            {words.map((word, index) => (
              <div key={index} className="word-item flex gap-2 text-base mb-3 break-inside-avoid">
                <span className="word-number font-semibold text-muted-foreground">{index + 1}.</span>
                <span className="word-text font-medium">{word.word_text}</span>
                <span className="separator text-muted-foreground">:</span>
                <span className="word-meaning text-muted-foreground">{word.meaning}</span>
              </div>
            ))}
          </div>
        )}

        {/* 인쇄 스타일 */}
        <style jsx global>{`
          @media print {
            /* 페이지 설정 */
            @page { 
              size: A4; 
              margin: 2cm; 
            }
            
            /* 모달 오버레이 숨김 */
            [data-radix-dialog-overlay] {
              display: none !important;
            }
            
            /* 모달 컨테이너 스타일 초기화 */
            [data-radix-dialog-content] {
              position: static !important;
              transform: none !important;
              max-width: 100% !important;
              max-height: 100% !important;
              box-shadow: none !important;
              border: none !important;
              padding: 1rem !important;
              margin: 0 !important;
            }
            
            /* 닫기 버튼 숨김 */
            button[aria-label="Close"] {
              display: none !important;
            }
            
            /* 단어 목록 컬럼 스타일 */
            .word-list {
              columns: 2 !important;
              column-gap: 4rem !important;
              column-rule: 1px solid #d1d5db !important;
              column-fill: auto !important;
              height: auto !important;
              max-height: calc(297mm - 4cm - 80px) !important;
              min-height: 10rem !important;
            }
            
            /* 단어 항목이 페이지 나눔 방지 */
            .word-item {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 12px !important;
              line-height: 1.8 !important;
            }
            
            /* 번호 스타일 */
            .word-number {
              font-weight: 600 !important;
              color: #6b7280 !important;
              flex-shrink: 0 !important;
            }
            
            /* 단어 텍스트 */
            .word-text {
              font-weight: 600 !important;
              color: #000 !important;
            }
            
            /* 구분자 */
            .separator {
              color: #6b7280 !important;
              flex-shrink: 0 !important;
            }
            
            /* 뜻 */
            .word-meaning {
              color: #374151 !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
