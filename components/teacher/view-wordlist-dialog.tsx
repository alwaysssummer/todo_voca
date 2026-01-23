'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Loader2, Download, BookOpen, Users, AlertCircle, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Word {
  id: number
  word_text: string
  meaning: string
  example?: string
  example_translation?: string
  mnemonic?: string
  sequence_order: number
}

interface ViewWordlistDialogProps {
  open: boolean
  onClose: () => void
  wordlistId: string
  wordlistTitle: string
  totalWords: number
  assignedStudents: number
}

export function ViewWordlistDialog({
  open,
  onClose,
  wordlistId,
  wordlistTitle,
  totalWords,
  assignedStudents
}: ViewWordlistDialogProps) {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jumpToWord, setJumpToWord] = useState('')
  const [highlightedWordId, setHighlightedWordId] = useState<number | null>(null)
  const wordRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)

  const loadWords = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('words')
        .select('*')
        .eq('wordlist_id', wordlistId)
        .order('sequence_order', { ascending: true })

      if (fetchError) throw fetchError

      setWords(data || [])
    } catch (err: any) {
      console.error('단어 로드 실패:', err)
      setError('단어를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [wordlistId])

  useEffect(() => {
    if (open && wordlistId) {
      loadWords()
    }
  }, [open, wordlistId, loadWords])

  // ScrollArea Viewport ref 설정
  useEffect(() => {
    if (open) {
      const viewport = document.querySelector('[data-radix-scroll-area-viewport]')
      scrollViewportRef.current = viewport as HTMLDivElement
    }
  }, [open, words])

  // 하이라이트 자동 해제 (3초)
  useEffect(() => {
    if (highlightedWordId) {
      const timer = setTimeout(() => {
        setHighlightedWordId(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [highlightedWordId])

  const handleJumpToWord = () => {
    const wordNumber = parseInt(jumpToWord)
    
    // 입력 검증
    if (isNaN(wordNumber) || wordNumber < 1 || wordNumber > totalWords) {
      alert(`1-${totalWords} 사이의 번호를 입력하세요`)
      return
    }
    
    const targetCard = wordRefs.current.get(wordNumber)
    
    if (targetCard) {
      // 스크롤 이동
      targetCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
      
      // 하이라이트 효과
      setHighlightedWordId(wordNumber)
      setJumpToWord('')
    }
  }

  const handleDownloadCSV = () => {
    try {
      // CSV 생성
      const headers = ['word_text', 'meaning', 'example', 'example_translation', 'mnemonic']
      const csvContent = [
        headers.join(','),
        ...words.map(word => 
          [
            word.word_text,
            word.meaning,
            word.example || '',
            word.example_translation || '',
            word.mnemonic || ''
          ].map(field => `"${field}"`).join(',')
        )
      ].join('\n')

      // BOM 추가 (엑셀에서 한글 깨짐 방지)
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${wordlistTitle}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV 다운로드 실패:', err)
      alert('CSV 다운로드에 실패했습니다')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{wordlistTitle}</DialogTitle>
          <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {totalWords}개 단어
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {assignedStudents}명 배정
            </Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">단어 목록 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* 단어 바로가기 */}
            <div className="flex gap-2 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder={`단어 번호 입력 (1-${totalWords})`}
                  value={jumpToWord}
                  onChange={(e) => setJumpToWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJumpToWord()}
                  min={1}
                  max={totalWords}
                  className="flex-1"
                />
              </div>
              <Button onClick={handleJumpToWord} size="sm" variant="secondary">
                이동
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {words.map((word, idx) => (
                <Card 
                  key={word.id} 
                  ref={(el) => {
                    if (el) wordRefs.current.set(word.sequence_order, el)
                  }}
                  className={cn(
                    "p-3 hover:bg-accent/50 transition-all duration-300",
                    highlightedWordId === word.sequence_order && "bg-yellow-100 border-2 border-yellow-400 shadow-lg"
                  )}
                >
                  <div className="space-y-1.5">
                    {/* 줄 1: 번호 + 영단어 + 뜻 */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {word.sequence_order}.
                      </span>
                      <span className="text-base font-bold">
                        {word.word_text}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm text-muted-foreground">
                        {word.meaning}
                      </span>
                    </div>

                    {/* 줄 2: 예문 + 번역 (있으면 표시) */}
                    {word.example && (
                      <div className="flex items-baseline gap-2 text-sm">
                        <span className="italic text-muted-foreground">
                          {word.example}
                        </span>
                        {word.example_translation && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-xs text-muted-foreground">
                              {word.example_translation}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* 줄 3: 연상법 (있으면 표시) */}
                    {word.mnemonic && (
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          💡 {word.mnemonic}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {words.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  단어가 없습니다
                </div>
              )}
            </div>
          </ScrollArea>
          </>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handleDownloadCSV}
            disabled={loading || words.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </Button>
          <Button onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

