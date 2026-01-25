'use client'

import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, X, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CompletedWordlist } from '@/types/database'

interface Word {
  id: string
  word_text: string
  meaning: string
  sequence_order: number
}

interface ExamPrintModalProps {
  open: boolean
  onClose: () => void
  sessionIds: string[]
  type: 'known' | 'unknown'
  title: string
}

export function ExamPrintModal({
  open,
  onClose,
  sessionIds,
  type,
  title
}: ExamPrintModalProps) {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [totalWords, setTotalWords] = useState(0) // 추출 전 전체 단어 수

  // Fisher-Yates Shuffle 알고리즘
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const loadWords = useCallback(async () => {
    setLoading(true)
    try {
      // 여러 회차의 데이터 가져오기
      type SessionData = Pick<CompletedWordlist, 'id' | 'word_ids' | 'unknown_word_ids'>
      const { data: sessions, error: sessionsError } = await supabase
        .from('completed_wordlists')
        .select('id, word_ids, unknown_word_ids')
        .in('id', sessionIds)
        .returns<SessionData[]>()

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        console.log('선택된 회차 데이터가 없습니다')
        setWords([])
        return
      }

      console.log('가져온 세션들:', sessions)

      // 타입에 따라 단어 ID 수집
      const wordIds: number[] = []
      sessions.forEach(session => {
        if (type === 'known' && session.word_ids) {
          wordIds.push(...session.word_ids)
        } else if (type === 'unknown' && session.unknown_word_ids) {
          wordIds.push(...session.unknown_word_ids)
        }
      })

      console.log(`${type === 'known' ? '아는' : '모르는'} 단어 ID (중복 포함):`, wordIds.length)

      // 중복 제거
      const uniqueWordIds = Array.from(new Set(wordIds))
      console.log('중복 제거 후:', uniqueWordIds.length)

      if (uniqueWordIds.length === 0) {
        console.log('단어가 없습니다')
        setWords([])
        return
      }

      // 단어 정보 가져오기
      const { data: wordData, error: wordError } = await supabase
        .from('words')
        .select('id, word_text, meaning, sequence_order')
        .in('id', uniqueWordIds)
        .order('sequence_order')

      if (wordError) throw wordError

      const allWords = wordData || []
      console.log('가져온 전체 단어 수:', allWords.length)
      setTotalWords(allWords.length)

      // 랜덤 추출: known은 30%, unknown은 70%
      const percentage = type === 'known' ? 0.3 : 0.7
      const targetCount = Math.ceil(allWords.length * percentage)

      console.log(`${type === 'known' ? '30%' : '70%'} 추출:`, targetCount, '개')

      // Fisher-Yates Shuffle로 랜덤화 후 필요한 개수만 추출
      const shuffled = shuffleArray(allWords)
      const selectedWords = shuffled.slice(0, targetCount)

      console.log('최종 선택된 단어:', selectedWords.length, '개')
      setWords(selectedWords)
    } catch (error) {
      console.error('단어 로드 실패:', error)
      setWords([])
      setTotalWords(0)
    } finally {
      setLoading(false)
    }
  }, [sessionIds, type])

  useEffect(() => {
    if (open && sessionIds.length > 0) {
      loadWords()
    }
  }, [open, sessionIds, type, loadWords])

  // 인쇄 핸들러
  const handlePrint = () => {
    setTimeout(() => {
      window.print()
    }, 100)
  }

  // 인쇄용 콘텐츠 렌더링 (접이식 레이아웃: 좌측 영어, 우측 한글)
  const renderPrintContent = () => {
    if (!open || words.length === 0) return null

    return (
      <div
        id="exam-print-content"
        style={{
          display: 'none',
          position: 'absolute',
          left: '-9999px'
        }}
      >
        {/* 인쇄 전용 스타일 - 접이식 레이아웃 */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            /* 모든 일반 콘텐츠 숨기기 */
            body * {
              visibility: hidden !important;
            }

            /* 인쇄 콘텐츠만 표시 */
            #exam-print-content,
            #exam-print-content * {
              visibility: visible !important;
            }

            /* 페이지 설정: A4 가로 */
            @page {
              size: A4 landscape;
              margin: 1cm 1.5cm;
            }

            /* HTML, Body 설정 */
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            /* 인쇄 콘텐츠 배치 */
            #exam-print-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: block !important;
            }

            /* 접이식 컨테이너 */
            .fold-container {
              display: flex !important;
              width: 100% !important;
              min-height: 100vh !important;
            }

            /* 좌측 영역 (영어) */
            .fold-left {
              width: 50% !important;
              border-right: 2px dashed #888 !important;
              padding-right: 1cm !important;
              box-sizing: border-box !important;
            }

            /* 우측 영역 (한글) */
            .fold-right {
              width: 50% !important;
              padding-left: 1cm !important;
              box-sizing: border-box !important;
            }
          }
        `}} />

        {/* 접이식 시험지: 좌측 영어 | 우측 한글 */}
        <div className="fold-container" style={{ display: 'flex', width: '100%' }}>
          {/* 좌측: 영어 단어 (시험 볼 때 보이는 면) */}
          <div className="fold-left" style={{
            width: '50%',
            paddingRight: '1cm',
            borderRight: '2px dashed #888'
          }}>
            {/* 헤더 */}
            <div style={{ marginBottom: '16px', color: '#000' }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '12px'
              }}>
                {type === 'known' ? 'O-TEST' : 'X-TEST'}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                borderBottom: '1px solid #000',
                paddingBottom: '8px'
              }}>
                <span>이름: ________________</span>
                <span>날짜: ____/____</span>
              </div>
            </div>

            {/* 영어 단어 목록 */}
            <div style={{ color: '#000' }}>
              {words.map((word, index) => (
                <div
                  key={word.id}
                  style={{
                    marginBottom: '6px',
                    lineHeight: '1.6',
                    fontSize: '13px'
                  }}
                >
                  {index + 1}. {word.word_text}
                </div>
              ))}
            </div>

            {/* 점수란 */}
            <div style={{
              marginTop: '20px',
              paddingTop: '12px',
              borderTop: '1px solid #ccc',
              fontSize: '12px',
              textAlign: 'right',
              color: '#000'
            }}>
              점수: _______ / {words.length}
            </div>
          </div>

          {/* 우측: 한글 뜻 (채점할 때 펼쳐서 보는 면) */}
          <div className="fold-right" style={{
            width: '50%',
            paddingLeft: '1cm'
          }}>
            {/* 헤더 */}
            <div style={{
              marginBottom: '16px',
              color: '#000',
              fontSize: '18px',
              fontWeight: 'bold',
              borderBottom: '1px solid #000',
              paddingBottom: '8px'
            }}>
              정답
            </div>

            {/* 한글 뜻 목록 */}
            <div style={{ color: '#000' }}>
              {words.map((word, index) => (
                <div
                  key={word.id}
                  style={{
                    marginBottom: '6px',
                    lineHeight: '1.6',
                    fontSize: '13px'
                  }}
                >
                  {index + 1}. {word.meaning}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
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
                시험지 인쇄
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
            <p className="text-sm mt-2">
              선택한 회차에 {type === 'known' ? '아는' : '모르는'} 단어가 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 디버그 정보 */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">시험지 단어 추출 정보:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 선택한 회차: {sessionIds.length}개</li>
                <li>• 전체 {type === 'known' ? '아는' : '모르는'} 단어: {totalWords}개 (중복 제거 완료)</li>
                <li>• 추출 비율: {type === 'known' ? '30%' : '70%'}</li>
                <li>• 추출된 시험지 단어: <strong className="text-blue-600">{words.length}개</strong></li>
                <li className="text-xs text-orange-600 mt-2">💡 모달을 닫았다가 다시 열면 랜덤으로 다시 추출됩니다</li>
              </ul>
            </div>

            {/* 단어 목록 (2단 레이아웃) */}
            <div className="columns-1 md:columns-2 gap-8 py-4">
              {words.map((word, index) => (
                <div key={word.id} className="flex gap-2 text-base mb-3 break-inside-avoid">
                  <span className="font-semibold text-muted-foreground">{index + 1}.</span>
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

