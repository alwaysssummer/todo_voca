'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    if (open && sessionIds.length > 0) {
      loadWords()
    }
  }, [open, sessionIds, type])

  // Fisher-Yates Shuffle 알고리즘
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const loadWords = async () => {
    setLoading(true)
    try {
      // 여러 회차의 데이터 가져오기
      const { data: sessions, error: sessionsError } = await supabase
        .from('completed_wordlists')
        .select('id, word_ids, unknown_word_ids')
        .in('id', sessionIds)

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        console.log('선택된 회차 데이터가 없습니다')
        setWords([])
        return
      }

      console.log('가져온 세션들:', sessions)

      // 타입에 따라 단어 ID 수집
      const wordIds: string[] = []
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
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {title} ({words.length}개)
            </DialogTitle>
            <Button 
              onClick={onClose}
              variant="ghost"
              size="icon"
            >
              <X className="w-4 h-4" />
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
  )
}

