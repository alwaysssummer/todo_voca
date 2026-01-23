'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Loader2, BookOpen } from 'lucide-react'

interface AssignWordlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  onSuccess: () => void
}

interface Wordlist {
  id: string
  name: string
  totalWords: number
  isAssigned: boolean
}

export function AssignWordlistDialog({ 
  open, 
  onOpenChange, 
  studentId, 
  studentName,
  onSuccess 
}: AssignWordlistDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [wordlists, setWordlists] = useState<Wordlist[]>([])
  const [selectedWordlists, setSelectedWordlists] = useState<string[]>([])
  const [error, setError] = useState('')

  const loadWordlists = useCallback(async () => {
    try {
      // 모든 단어장 가져오기 (display_order로 정렬)
      const { data: allWordlists, error: wordlistsError } = await supabase
        .from('wordlists')
        .select('id, name, total_words')
        .order('display_order', { ascending: true })
        .returns<{ id: string; name: string; total_words: number }[]>()

      if (wordlistsError) throw wordlistsError

      // 해당 학생에게 이미 배정된 단어장 확인
      const { data: assignedWordlists, error: assignedError } = await supabase
        .from('student_wordlists')
        .select('wordlist_id')
        .eq('student_id', studentId)
        .returns<{ wordlist_id: string }[]>()

      if (assignedError) throw assignedError

      const assignedIds = new Set((assignedWordlists || []).map(aw => aw.wordlist_id))

      const wordlistsWithStatus: Wordlist[] = (allWordlists || []).map(w => ({
        id: w.id,
        name: w.name,
        totalWords: w.total_words,
        isAssigned: assignedIds.has(w.id)
      }))

      setWordlists(wordlistsWithStatus)

      // 기존에 배정된 단어장을 기본 선택
      setSelectedWordlists(
        wordlistsWithStatus
          .filter(w => w.isAssigned)
          .map(w => w.id)
      )
    } catch (err: any) {
      console.error('단어장 로드 오류:', err)
      setError(err.message || '단어장을 불러오는 중 오류가 발생했습니다')
    }
  }, [studentId])

  useEffect(() => {
    if (open) {
      loadWordlists()
    }
  }, [open, studentId, loadWordlists])

  const handleToggle = (wordlistId: string) => {
    setSelectedWordlists(prev =>
      prev.includes(wordlistId)
        ? prev.filter(id => id !== wordlistId)
        : [...prev, wordlistId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const teacherId = sessionStorage.getItem('teacher_id') || localStorage.getItem('teacher_id')
      if (!teacherId) throw new Error('로그인이 필요합니다')

      // ⭐ 학생의 daily_goal 가져오기
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('daily_goal')
        .eq('id', studentId)
        .single<{ daily_goal: number | null }>()

      if (studentError) {
        throw new Error(`학생 정보를 가져올 수 없습니다: ${studentError.message || studentError.code}`)
      }
      if (!student) throw new Error('학생을 찾을 수 없습니다')

      // ⭐ 1. 기존 배정된 단어장 ID 가져오기
      const { data: oldAssignments } = await supabase
        .from('student_wordlists')
        .select('wordlist_id')
        .eq('student_id', studentId)
        .returns<{ wordlist_id: string }[]>()

      const oldWordlistIds = oldAssignments?.map(a => a.wordlist_id) || []

      // ⭐ 2. 학습 기록이 있는지 확인 후 경고
      if (oldWordlistIds.length > 0) {
        const { count: progressCount } = await supabase
          .from('student_word_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)

        if (progressCount && progressCount > 0) {
          const confirmed = confirm(
            `⚠️ 주의: 기존 학습 기록이 모두 삭제됩니다.\n\n` +
            `삭제될 데이터:\n` +
            `- 학습 진도 (${progressCount}개 단어)\n` +
            `- 완성 회차\n` +
            `- 테스트 기록\n\n` +
            `계속하시겠습니까?`
          )
          
          if (!confirmed) {
            setLoading(false)
            return
          }
        }

        // ⭐ 3. 관련 데이터 모두 삭제
        // 3-1. completed_wordlists의 ID 가져오기
        const { data: completedWordlists } = await supabase
          .from('completed_wordlists')
          .select('id')
          .eq('student_id', studentId)
          .in('wordlist_id', oldWordlistIds)
          .returns<{ id: string }[]>()

        const completedWordlistIds = completedWordlists?.map(c => c.id) || []
        
        // 3-2. online_tests 삭제
        if (completedWordlistIds.length > 0) {
          await supabase
            .from('online_tests')
            .delete()
            .in('completed_wordlist_id', completedWordlistIds)
        }

        // 3-3. completed_wordlists 삭제
        await supabase
          .from('completed_wordlists')
          .delete()
          .eq('student_id', studentId)
          .in('wordlist_id', oldWordlistIds)

        // 3-4. student_word_progress 삭제
        const { data: words } = await supabase
          .from('words')
          .select('id')
          .in('wordlist_id', oldWordlistIds)
          .returns<{ id: number }[]>()

        const wordIds = words?.map(w => w.id) || []
        
        if (wordIds.length > 0) {
          await supabase
            .from('student_word_progress')
            .delete()
            .eq('student_id', studentId)
            .in('word_id', wordIds)
        }
      }

      // ⭐ 4. 기존 배정 삭제
      await supabase
        .from('student_wordlists')
        .delete()
        .eq('student_id', studentId)

      // ⭐ 5. 새로운 배정 추가
      if (selectedWordlists.length > 0) {
        // ⭐ daily_goal을 5~100 범위로 클램프 (DB 제약조건: CHECK (daily_goal BETWEEN 5 AND 100))
        const clampedDailyGoal = Math.max(5, Math.min(100, student.daily_goal || 20))

        const assignmentsToInsert = selectedWordlists.map(wordlistId => ({
          student_id: studentId,
          wordlist_id: wordlistId,
          assigned_by: teacherId,
          daily_goal: clampedDailyGoal
        }))

        const { error: insertError } = await (supabase as any)
          .from('student_wordlists')
          .insert(assignmentsToInsert)

        if (insertError) {
          throw new Error(`단어장 배정 중 오류: ${insertError.message || insertError.code}`)
        }
      }

      // 성공
      onOpenChange(false)
      onSuccess()
      router.refresh()
    } catch (err: any) {
      console.error('단어장 배정 오류:', err)
      setError(err.message || '단어장 배정 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>단어장 배정</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{studentName}</span> 학생에게 배정할 단어장을 선택하세요
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="max-h-[400px] overflow-y-auto py-4">
            {wordlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>등록된 단어장이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wordlists.map((wordlist) => (
                  <div
                    key={wordlist.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={wordlist.id}
                      checked={selectedWordlists.includes(wordlist.id)}
                      onCheckedChange={() => handleToggle(wordlist.id)}
                      disabled={loading}
                    />
                    <Label
                      htmlFor={wordlist.id}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{wordlist.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {wordlist.totalWords}개 단어
                        </div>
                      </div>
                      {wordlist.isAssigned && (
                        <Badge variant="secondary">배정됨</Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              배정하기 ({selectedWordlists.length}개)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

