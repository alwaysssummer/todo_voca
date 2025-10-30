'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Word {
  id: string
  word_text: string
  meaning: string
  sequence_order: number
}

interface WholeVocabularyPrintModalProps {
  open: boolean
  onClose: () => void
  wordlistId: string
  title: string
}

export function WholeVocabularyPrintModal({
  open,
  onClose,
  wordlistId,
  title
}: WholeVocabularyPrintModalProps) {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('WholeVocabularyPrintModal useEffect:', { open, wordlistId })
    if (open && wordlistId) {
      loadWords()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wordlistId])

  // 인쇄 핸들러
  const handlePrint = () => {
    setTimeout(() => {
      window.print()
    }, 100)
  }

  // 인쇄용 콘텐츠 렌더링
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
        id="whole-vocabulary-print-content"
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
            #whole-vocabulary-print-content,
            #whole-vocabulary-print-content * {
              visibility: visible !important;
            }
            
            /* 페이지 설정 */
            @page {
              size: A4;
              margin: 2cm;
            }
            
            /* HTML, Body 설정 */
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            /* 인쇄 콘텐츠 배치 */
            #whole-vocabulary-print-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: block !important;
            }
          }
        `}} />

        {/* 단어장 */}
        <div className="vocabulary-section">
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '32px',
            color: '#000'
          }}>
            {title}
          </h1>

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
                  key={word.id}
                  style={{
                    marginBottom: '12px',
                    lineHeight: '1.8',
                    fontSize: '14px'
                  }}
                >
                  ☐ {word.word_text} : {word.meaning}
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
                  key={word.id}
                  style={{
                    marginBottom: '12px',
                    lineHeight: '1.8',
                    fontSize: '14px'
                  }}
                >
                  ☐ {word.word_text} : {word.meaning}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const loadWords = async () => {
    setLoading(true)
    try {
      console.log('전체 단어장 로드:', wordlistId)
      
      // 단순하게 wordlist_id로 모든 단어 조회
      const { data: wordData, error: wordError } = await supabase
        .from('words')
        .select('id, word_text, meaning, sequence_order')
        .eq('wordlist_id', wordlistId)
        .order('sequence_order')

      if (wordError) throw wordError
      
      const allWords = wordData || []
      console.log('전체 단어 수:', allWords.length)
      
      setWords(allWords)
    } catch (error) {
      console.error('단어 로드 실패:', error)
      setWords([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                {title} ({words.length}개)
              </DialogTitle>
              <Button 
                onClick={handlePrint}
                className="gap-2"
                variant="outline"
                disabled={loading || words.length === 0}
              >
                <Printer className="w-4 h-4" />
                단어장 인쇄
              </Button>
            </div>
          </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">단어가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 정보 */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">📚 전체 단어장</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 원본 단어장의 모든 단어</li>
                <li>• 총 단어 수: <strong className="text-blue-600">{words.length}개</strong></li>
                <li>• 순서: 원본 순서대로 (sequence_order)</li>
              </ul>
            </div>

            {/* 단어 목록 (2단 레이아웃) */}
            <div className="columns-1 md:columns-2 gap-8 py-4">
              {words.map((word, index) => (
                <div key={word.id} className="flex gap-2 text-base mb-3 break-inside-avoid">
                  <span className="font-semibold text-muted-foreground">☐</span>
                  <span className="font-medium">{word.word_text}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-muted-foreground">{word.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>

      {/* 인쇄 전용 콘텐츠 */}
      {renderPrintContent()}
    </>
  )
}

