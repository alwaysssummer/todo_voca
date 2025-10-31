'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchSheetData } from '@/lib/google-sheets'

interface AddWordlistDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddWordlistDialog({ 
  open, 
  onClose, 
  onSuccess 
}: AddWordlistDialogProps) {
  const [sheetUrl, setSheetUrl] = useState('')
  const [wordlistName, setWordlistName] = useState('')
  const [words, setWords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'preview'>('input')

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) {
      setError('구글 시트 URL을 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await fetchSheetData(sheetUrl)
      
      if (data.words.length === 0) {
        throw new Error('단어가 없습니다. 시트 형식을 확인해주세요.')
      }

      setWordlistName(data.title)
      setWords(data.words)
      setStep('preview')
    } catch (err: any) {
      console.error('시트 불러오기 실패:', err)
      setError(err.message || '시트를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!wordlistName.trim()) {
      setError('단어장 이름을 입력해주세요')
      return
    }

    setCreating(true)
    setError('')

    try {
      const teacherId = sessionStorage.getItem('teacher_id')
      
      // 1. wordlist 생성
      const { data: wordlist, error: wordlistError } = await supabase
        .from('wordlists')
        .insert({
          name: wordlistName,
          total_words: words.length,
          created_by: teacherId
        })
        .select()
        .single()

      if (wordlistError) throw wordlistError

      // 2. words 추가 (bulk insert)
      const wordsToInsert = words.map((word, idx) => ({
        wordlist_id: wordlist.id,
        word_text: word.word_text || '',
        meaning: word.meaning || '',
        example: word.example || null,
        example_translation: word.example_translation || null,
        mnemonic: word.mnemonic || null,
        sequence_order: idx + 1
      }))

      const { error: wordsError } = await supabase
        .from('words')
        .insert(wordsToInsert)

      if (wordsError) throw wordsError

      // 성공!
      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error('단어장 생성 실패:', err)
      setError(err.message || '단어장 생성에 실패했습니다')
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setSheetUrl('')
    setWordlistName('')
    setWords([])
    setError('')
    setStep('input')
    onClose()
  }

  const downloadTemplate = () => {
    const csv = `영단어,뜻,연상법,예문,예문 번역
apple,사과,빨간 사과,I eat an apple every day.,나는 매일 사과를 먹는다.
book,책,,Read a book.,책을 읽어.
computer,컴퓨터,컴퓨팅,Use a computer.,컴퓨터를 사용해.`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wordlist_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>단어장 추가</DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">구글 시트 URL</Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">시트 공유 설정:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>구글 시트에서 &quot;공유&quot; 클릭</li>
                  <li>&quot;링크가 있는 모든 사용자&quot; 선택</li>
                  <li>&quot;뷰어&quot; 권한으로 설정</li>
                  <li>URL 복사</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-medium text-sm">시트 형식:</p>
                <div className="text-xs font-mono bg-muted p-2 rounded">
                  <div>A열: 영단어 (필수)</div>
                  <div>B열: 뜻 (필수)</div>
                  <div>C열: 연상법 (선택)</div>
                  <div>D열: 예문 (선택)</div>
                  <div>E열: 예문 번역 (선택)</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * 1행은 헤더로 자동 제외됩니다
                </p>
                <p className="text-xs text-muted-foreground">
                  * 헤더 이름과 관계없이 컬럼 순서로 데이터를 읽습니다
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="w-full mt-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV 템플릿 다운로드
                </Button>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button onClick={handleFetchSheet} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  '불러오기'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <span className="font-semibold">{words.length}개</span> 단어를 찾았습니다!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="wordlist-name">단어장 이름</Label>
              <Input
                id="wordlist-name"
                value={wordlistName}
                onChange={(e) => setWordlistName(e.target.value)}
                disabled={creating}
              />
            </div>

            <div>
              <Label>미리보기 (처음 3개)</Label>
              <div className="mt-2 space-y-2">
                {words.slice(0, 3).map((word, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">
                          {idx + 1}. {word.word_text}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {word.meaning}
                        </div>
                        {word.example && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            {word.example}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {words.length > 3 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    ... 외 {words.length - 3}개
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('input')}
                disabled={creating}
              >
                뒤로
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '단어장 생성'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

