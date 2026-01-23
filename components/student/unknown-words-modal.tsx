'use client'

import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CompletedWordlist } from '@/types/database'

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

  const loadWords = useCallback(async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase
        .from('completed_wordlists')
        .select('unknown_word_ids')
        .eq('id', sessionId)
        .single<Pick<CompletedWordlist, 'unknown_word_ids'>>()

      if (session?.unknown_word_ids && session.unknown_word_ids.length > 0) {
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
  }, [sessionId])

  useEffect(() => {
    if (open && sessionId) {
      loadWords()
    }
  }, [open, sessionId, loadWords])

  const handlePrint = () => {
    // 렌더링 완료 대기
    setTimeout(() => {
      window.print()
    }, 100)
  }

  // 인쇄용 HTML을 완전히 독립적으로 생성
  const renderPrintContent = () => {
    if (!open || words.length === 0) return null

    const leftColumn: Word[] = []
    const rightColumn: Word[] = []
    
    // 좌우 컬럼 분배 (좌측 먼저 채우기)
    words.forEach((word, index) => {
      if (index < Math.ceil(words.length / 2)) {
        leftColumn.push(word)
      } else {
        rightColumn.push(word)
      }
    })

    return (
      <div
        id="print-only-content"
        style={{
          display: 'none',
          position: 'absolute',
          left: '-9999px'
        }}
      >
        {/* 인쇄 전용 스타일 */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            /* 모든 일반 콘텐츠 숨기기 */
            body * {
              visibility: hidden !important;
            }
            
            /* 인쇄 콘텐츠만 표시 */
            #print-only-content,
            #print-only-content * {
              visibility: visible !important;
            }
            
            /* 페이지 설정 - 여백 포함 */
            @page {
              size: A4;
              margin: 2cm;
            }
            
            /* HTML, Body 완전 제약 */
            html, body {
              width: 100% !important;
              height: 297mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            
            /* 인쇄 콘텐츠 배치 및 높이 제한 */
            #print-only-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: calc(297mm - 4cm) !important; /* A4 높이 - 상하 여백 */
              display: block !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              page-break-inside: avoid !important;
            }
            
            /* 내부 요소들도 페이지 분할 방지 */
            #print-only-content * {
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
          }
        `}} />

        {/* 제목 */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '32px',
          color: '#000'
        }}>
          {sessionNumber}회차 - 모르는 단어 ({unknownCount}개)
        </h1>

        {/* 2단 레이아웃 */}
        <div style={{
          display: 'flex',
          gap: '4rem',
          color: '#000'
        }}>
          {/* 좌측 컬럼 */}
          <div style={{
            flex: 1,
            borderRight: '1px solid #d1d5db',
            paddingRight: '2rem'
          }}>
            {leftColumn.map((word, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '12px',
                  lineHeight: '1.8',
                  fontSize: '14px',
                  pageBreakInside: 'avoid'
                }}
              >
                {index + 1}. {word.word_text} : {word.meaning}
              </div>
            ))}
          </div>

          {/* 우측 컬럼 */}
          <div style={{
            flex: 1,
            paddingLeft: '2rem'
          }}>
            {rightColumn.map((word, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '12px',
                  lineHeight: '1.8',
                  fontSize: '14px',
                  pageBreakInside: 'avoid'
                }}
              >
                {leftColumn.length + index + 1}. {word.word_text} : {word.meaning}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 화면용 모달 */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                {sessionNumber}회차 - 모르는 단어 ({unknownCount}개)
              </DialogTitle>
              <Button 
                onClick={handlePrint}
                className="gap-2"
                variant="outline"
                disabled={loading || words.length === 0}
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
            <div className="columns-1 md:columns-2 gap-8 py-4">
              {words.map((word, index) => (
                <div key={index} className="flex gap-2 text-base mb-3 break-inside-avoid">
                  <span className="font-semibold text-muted-foreground">{index + 1}.</span>
                  <span className="font-medium">{word.word_text}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-muted-foreground">{word.meaning}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 인쇄 전용 콘텐츠 */}
      {renderPrintContent()}
    </>
  )
}
