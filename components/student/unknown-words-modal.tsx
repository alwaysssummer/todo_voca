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
    <>
      {/* 화면용 모달 (인쇄 시 숨김) */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                {sessionNumber}회차 - 모르는 단어 ({unknownCount}개)
              </DialogTitle>
              {/* 인쇄 버튼 */}
              <Button 
                onClick={handlePrint}
                className="gap-2"
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
            /* 2단 컬럼 레이아웃 (좌측 먼저 채우기) */
            <div className="columns-1 md:columns-2 gap-8 py-4">
              {words.map((word, index) => (
                <div key={index} className="flex gap-2 text-base mb-3 break-inside-avoid">
                  <span className="font-medium">{word.word_text}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-muted-foreground">{word.meaning}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 인쇄 전용 레이아웃 (화면에서 숨김) */}
      {open && words.length > 0 && (
        <div className="print:block">
          <div className="print-page">
            {/* 제목 */}
            <h1 className="text-2xl font-bold mb-8">
              {sessionNumber}회차 - 모르는 단어 ({unknownCount}개)
            </h1>

            {/* 단어 목록 (2단 컬럼) */}
            <div className="word-columns">
              {words.map((word, index) => (
                <div key={index} className="word-item">
                  <span className="word-number">{index + 1}. </span>
                  <span className="word-text">{word.word_text}</span>
                  <span className="separator"> : </span>
                  <span className="word-meaning">{word.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 인쇄 전용 스타일 */}
          <style jsx>{`
            /* 화면에서는 숨김 */
            @media screen {
              .print-page {
                display: none;
              }
            }
            
            @media print {
              /* 페이지 설정 */
              @page {
                size: A4;
                margin: 2cm;
              }

              /* 인쇄 레이아웃 */
              .print-page {
                width: 100%;
                height: 100%;
                padding: 0;
                margin: 0;
                page-break-after: avoid;
              }

              /* 제목 스타일 */
              h1 {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 32px;
              }

              /* 2단 컬럼 (좌측 우선 채우기) */
              .word-columns {
                columns: 2;
                column-gap: 4rem;
                column-rule: 1px solid #d1d5db;
                column-fill: auto;
                height: auto;
                max-height: calc(297mm - 4cm - 80px);
                min-height: 10rem;
              }

              /* 단어 항목 */
              .word-item {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 12px;
                line-height: 1.8;
                display: flex;
                align-items: baseline;
              }

              /* 번호 스타일 */
              .word-number {
                font-weight: 600;
                color: #6b7280;
                margin-right: 4px;
                flex-shrink: 0;
              }

              /* 단어 텍스트 */
              .word-text {
                font-weight: 600;
              }

              /* 구분자 */
              .separator {
                color: #6b7280;
                flex-shrink: 0;
              }

              /* 뜻 */
              .word-meaning {
                color: #374151;
              }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
