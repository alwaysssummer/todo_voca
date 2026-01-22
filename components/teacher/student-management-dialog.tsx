'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Trash2,
  BookOpen,
  RefreshCw,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Save,
} from 'lucide-react'

interface StudentManagementDialogProps {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  accessToken: string
  onDataChanged?: () => void
}

interface WordlistInfo {
  id: string
  name: string
  total_words: number
  isAssigned: boolean
  assignmentId?: string
  progressPercent?: number
  completedWords?: number
  is_review?: boolean
}

interface AssignmentWithWordlist {
  id: string
  wordlist_id: string
  generation: number
  is_auto_generated: boolean
  base_wordlist_id: string | null
  parent_assignment_id: string | null
  daily_goal: number
  current_session: number
  wordlist_name: string
  total_words: number
  filtered_word_ids: number[] | null
}

interface AssignmentStats {
  assignment_id: string
  completed_words: number
  completed_sessions: number
  total_sessions: number
  o_test_completed: number
  x_test_completed: number
}

interface TreeNode {
  assignment: AssignmentWithWordlist
  stats: AssignmentStats | null
  children: TreeNode[]
}

export function StudentManagementDialog({
  open,
  onClose,
  studentId,
  studentName,
  accessToken,
  onDataChanged,
}: StudentManagementDialogProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignments, setAssignments] = useState<TreeNode[]>([])
  const [allWordlists, setAllWordlists] = useState<WordlistInfo[]>([])
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map())
  const [dailyGoal, setDailyGoal] = useState<number>(20)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (open && studentId) {
      loadAllData()
    }
  }, [open, studentId])

  const loadAllData = async () => {
    setLoading(true)
    setPendingChanges(new Map())
    try {
      await Promise.all([
        loadStudentInfo(),
        loadWordlistsWithAssignments(),
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadStudentInfo = async () => {
    const { data } = await supabase
      .from('users')
      .select('daily_goal')
      .eq('id', studentId)
      .single()

    if (data) {
      const userData = data as { daily_goal: number | null }
      setDailyGoal(userData.daily_goal || 20)
    }
  }

  const loadWordlistsWithAssignments = async () => {
    // 1-1. 원본 단어장 조회 (is_review가 null 또는 false)
    const { data: originalWordlistsData } = await supabase
      .from('wordlists')
      .select('id, name, total_words, is_review')
      .or('is_review.is.null,is_review.eq.false')
      .order('display_order', { ascending: true })

    // 1-2. 복습 단어장 조회 (해당 학생용만)
    const { data: reviewWordlistsData } = await supabase
      .from('wordlists')
      .select('id, name, total_words, is_review')
      .eq('is_review', true)
      .eq('created_for_student_id', studentId)
      .order('created_at', { ascending: false })

    const originalWordlists = (originalWordlistsData as { id: string; name: string; total_words: number; is_review?: boolean }[]) || []
    const reviewWordlists = (reviewWordlistsData as { id: string; name: string; total_words: number; is_review?: boolean }[]) || []
    const wordlists = [...originalWordlists, ...reviewWordlists]

    // 2. 학생의 배정 조회
    interface AssignmentRow {
      id: string
      wordlist_id: string
      generation: number | null
      is_auto_generated: boolean | null
      base_wordlist_id: string | null
      parent_assignment_id: string | null
      daily_goal: number | null
      current_session: number | null
      filtered_word_ids: number[] | null
    }

    const { data: assignmentsData } = await supabase
      .from('student_wordlists')
      .select(`
        id,
        wordlist_id,
        generation,
        is_auto_generated,
        base_wordlist_id,
        parent_assignment_id,
        daily_goal,
        current_session,
        filtered_word_ids
      `)
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: true })

    const assignmentsList = (assignmentsData as unknown as AssignmentRow[]) || []

    // 배정된 단어장 ID 맵
    const assignedMap = new Map<string, AssignmentRow>()
    assignmentsList.forEach(a => {
      // 원본 단어장 (generation 1이고 is_auto_generated가 false)
      if (a.generation === 1 && !a.is_auto_generated) {
        assignedMap.set(a.wordlist_id, a)
      }
      // 복습 단어장이 있으면 원본(base_wordlist_id)도 "배정된 것"으로 간주
      if (a.base_wordlist_id && !assignedMap.has(a.base_wordlist_id)) {
        assignedMap.set(a.base_wordlist_id, a)
      }
    })

    // 3. 배정된 단어장의 진행률 계산
    // ⭐ student_word_progress에는 wordlist_id가 없으므로, words 테이블에서 단어 ID를 먼저 조회
    const progressPromises = Array.from(assignedMap.entries()).map(async ([wordlistId, assignment]) => {
      // 해당 단어장의 단어 ID 목록 조회
      const { data: wordsData } = await supabase
        .from('words')
        .select('id')
        .eq('wordlist_id', wordlistId)

      const wordIds = wordsData?.map((w: { id: number }) => w.id) || []

      let completedCount = 0
      if (wordIds.length > 0) {
        const { count } = await supabase
          .from('student_word_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .in('word_id', wordIds)
          .eq('status', 'completed')

        completedCount = count || 0
      }

      return {
        wordlistId,
        assignmentId: assignment.id,
        completedWords: completedCount,
      }
    })

    const progressResults = await Promise.all(progressPromises)
    const progressMap = new Map(progressResults.map(p => [p.wordlistId, p]))

    // 4. 단어장 목록 구성 (원본/복습 구분 포함)
    const wordlistInfos: WordlistInfo[] = wordlists.map(wl => {
      const progress = progressMap.get(wl.id)
      const isAssigned = assignedMap.has(wl.id)
      return {
        id: wl.id,
        name: wl.name,
        total_words: wl.total_words,
        isAssigned,
        assignmentId: progress?.assignmentId,
        progressPercent: isAssigned ? Math.round((progress?.completedWords || 0) / wl.total_words * 100) : undefined,
        completedWords: progress?.completedWords,
        is_review: wl.is_review || false,
      }
    })

    setAllWordlists(wordlistInfos)

    // 5. 트리 구조 구성 (기존 배정된 단어장들)
    await loadAssignmentsTree(assignmentsList, wordlists)
  }

  const loadAssignmentsTree = async (
    assignmentsList: any[],
    wordlists: { id: string; name: string; total_words: number }[]
  ) => {
    // 배정된 단어장 ID 목록
    const assignedWordlistIds = assignmentsList.map(a => a.wordlist_id)

    // 배정된 단어장 중 wordlists에 없는 것들 조회 (삭제된 단어장 등)
    const missingIds = assignedWordlistIds.filter(id => !wordlists.find(w => w.id === id))

    let allWordlistsData = [...wordlists]
    if (missingIds.length > 0) {
      const { data: missingWordlists } = await supabase
        .from('wordlists')
        .select('id, name, total_words')
        .in('id', missingIds)

      if (missingWordlists) {
        allWordlistsData = [...wordlists, ...(missingWordlists as { id: string; name: string; total_words: number }[])]
      }
    }

    const wordlistMap = new Map(allWordlistsData.map(wl => [wl.id, wl]))

    // 통계 조회
    const statsPromises = assignmentsList.map(async (assignment) => {
      const wordlistData = wordlistMap.get(assignment.wordlist_id)
      const totalWords = assignment.filtered_word_ids?.length || wordlistData?.total_words || 0
      const totalSessions = Math.ceil(totalWords / (assignment.daily_goal || 20))

      const { count: completedSessions } = await supabase
        .from('completed_wordlists')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', assignment.id)

      // ⭐ student_word_progress에는 wordlist_id가 없으므로, 단어 ID 목록으로 필터링
      let targetWordIds = assignment.filtered_word_ids || []
      if (targetWordIds.length === 0) {
        const { data: wordsData } = await supabase
          .from('words')
          .select('id')
          .eq('wordlist_id', assignment.wordlist_id)

        targetWordIds = wordsData?.map((w: { id: number }) => w.id) || []
      }

      let completedWords = 0
      if (targetWordIds.length > 0) {
        const { count } = await supabase
          .from('student_word_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .in('word_id', targetWordIds)
          .eq('status', 'completed')

        completedWords = count || 0
      }

      const { count: oTestCompleted } = await supabase
        .from('online_tests')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .in('completed_wordlist_id',
          (await supabase
            .from('completed_wordlists')
            .select('id')
            .eq('assignment_id', assignment.id)
          ).data?.map((c: any) => c.id) || []
        )
        .eq('test_type', 'known')

      const { count: xTestCompleted } = await supabase
        .from('online_tests')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .in('completed_wordlist_id',
          (await supabase
            .from('completed_wordlists')
            .select('id')
            .eq('assignment_id', assignment.id)
          ).data?.map((c: any) => c.id) || []
        )
        .eq('test_type', 'unknown')

      return {
        assignment_id: assignment.id,
        completed_words: completedWords || 0,
        completed_sessions: completedSessions || 0,
        total_sessions: totalSessions,
        o_test_completed: oTestCompleted || 0,
        x_test_completed: xTestCompleted || 0,
      }
    })

    const stats = await Promise.all(statsPromises)
    const statsMap = new Map(stats.map(s => [s.assignment_id, s]))

    // 트리 구조로 변환
    const assignmentsWithDetails: AssignmentWithWordlist[] = assignmentsList.map(a => {
      const wordlistData = wordlistMap.get(a.wordlist_id)
      return {
        id: a.id,
        wordlist_id: a.wordlist_id,
        generation: a.generation || 1,
        is_auto_generated: a.is_auto_generated || false,
        base_wordlist_id: a.base_wordlist_id,
        parent_assignment_id: a.parent_assignment_id,
        daily_goal: a.daily_goal || 20,
        current_session: a.current_session || 1,
        wordlist_name: wordlistData?.name || '알 수 없음',
        total_words: a.filtered_word_ids?.length || wordlistData?.total_words || 0,
        filtered_word_ids: a.filtered_word_ids,
      }
    })

    const tree = buildTree(assignmentsWithDetails, statsMap)
    setAssignments(tree)

    const allIds = new Set(assignmentsWithDetails.map(a => a.id))
    setExpandedNodes(allIds)
  }

  const buildTree = (
    assignments: AssignmentWithWordlist[],
    statsMap: Map<string, AssignmentStats>
  ): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    assignments.forEach(assignment => {
      nodeMap.set(assignment.id, {
        assignment,
        stats: statsMap.get(assignment.id) || null,
        children: [],
      })
    })

    assignments.forEach(assignment => {
      const node = nodeMap.get(assignment.id)!
      if (assignment.parent_assignment_id && nodeMap.has(assignment.parent_assignment_id)) {
        nodeMap.get(assignment.parent_assignment_id)!.children.push(node)
      } else if (assignment.generation === 1 || !assignment.parent_assignment_id) {
        roots.push(node)
      } else {
        roots.push(node)
      }
    })

    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => a.assignment.generation - b.assignment.generation)
      node.children.forEach(sortChildren)
    }
    roots.forEach(sortChildren)

    return roots
  }

  // 즉시 저장 방식: 체크박스 클릭 시 바로 DB에 저장
  const handleToggleWordlist = async (wordlistId: string, currentlyAssigned: boolean) => {
    const wordlist = allWordlists.find(w => w.id === wordlistId)
    if (!wordlist) return

    // 로딩 상태 표시
    setPendingChanges(prev => new Map(prev).set(wordlistId, !currentlyAssigned))
    setSaving(true)

    try {
      if (!currentlyAssigned) {
        // 새로 배정
        const { data: teacherData } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'teacher')
          .limit(1)
          .single()
          .returns<{ id: string }>()

        await (supabase as any).from('student_wordlists').insert({
          student_id: studentId,
          wordlist_id: wordlistId,
          assigned_by: (teacherData as { id: string } | null)?.id,
          generation: 1,
          is_auto_generated: false,
          base_wordlist_id: wordlistId,
          daily_goal: dailyGoal,
        })
      } else {
        // 배정 해제 - 모든 관련 학습 기록도 함께 삭제 (초기화)
        // 1. 해당 배정의 assignment 정보 조회
        const { data: assignmentData } = await supabase
          .from('student_wordlists')
          .select('id, wordlist_id, filtered_word_ids')
          .eq('student_id', studentId)
          .eq('wordlist_id', wordlistId)
          .eq('generation', 1)
          .eq('is_auto_generated', false)
          .single()

        if (assignmentData) {
          // 2. 재귀적으로 배정과 관련 데이터 삭제
          const deleteRecursively = async (
            assignmentId: string,
            wlId: string,
            filteredWordIds: number[] | null
          ) => {
            // 하위 배정 조회 (복습 단어장 등)
            const { data: childrenData } = await supabase
              .from('student_wordlists')
              .select('id, wordlist_id, filtered_word_ids')
              .eq('parent_assignment_id', assignmentId)

            interface ChildAssignment {
              id: string
              wordlist_id: string
              filtered_word_ids: number[] | null
            }
            const children = childrenData as ChildAssignment[] | null

            // 하위 배정 재귀 삭제
            if (children) {
              for (const child of children) {
                await deleteRecursively(child.id, child.wordlist_id, child.filtered_word_ids)
              }
            }

            // 대상 단어 ID 목록 결정
            let targetWordIds = filteredWordIds || []
            if (targetWordIds.length === 0) {
              const { data: wordsData } = await supabase
                .from('words')
                .select('id')
                .eq('wordlist_id', wlId)

              if (wordsData) {
                targetWordIds = wordsData.map((w: { id: number }) => w.id)
              }
            }

            // student_word_progress 삭제
            if (targetWordIds.length > 0) {
              await supabase
                .from('student_word_progress')
                .delete()
                .eq('student_id', studentId)
                .in('word_id', targetWordIds)
            }

            // online_tests 삭제
            const { data: completedWordlistIds } = await supabase
              .from('completed_wordlists')
              .select('id')
              .eq('assignment_id', assignmentId)

            if (completedWordlistIds && completedWordlistIds.length > 0) {
              await supabase
                .from('online_tests')
                .delete()
                .eq('student_id', studentId)
                .in('completed_wordlist_id', completedWordlistIds.map((c: { id: string }) => c.id))
            }

            // completed_wordlists 삭제
            await supabase.from('completed_wordlists').delete().eq('assignment_id', assignmentId)

            // student_wordlists 삭제
            await supabase.from('student_wordlists').delete().eq('id', assignmentId)
          }

          await deleteRecursively(
            assignmentData.id,
            assignmentData.wordlist_id,
            assignmentData.filtered_word_ids as number[] | null
          )
        }
      }

      // 즉시 데이터 새로고침
      await loadAllData()
      onDataChanged?.()

    } catch (error) {
      console.error('저장 실패:', error)
    } finally {
      setSaving(false)
      setPendingChanges(new Map())
    }
  }

  const getEffectiveAssignmentState = (wordlist: WordlistInfo): boolean => {
    return wordlist.isAssigned
  }

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDeleteAssignment = async (assignment: AssignmentWithWordlist) => {
    const message = `"${assignment.wordlist_name}" 배정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 학습 기록과 하위 복습 단어장도 함께 삭제됩니다.`

    if (!confirm(message)) return

    setDeleting(true)
    try {
      // ⭐ 재귀적으로 배정과 관련 데이터 삭제
      const deleteRecursively = async (
        assignmentId: string,
        wordlistId: string,
        filteredWordIds: number[] | null
      ) => {
        // 1. 하위 배정 조회 (복습 단어장 등)
        const { data: childrenData } = await supabase
          .from('student_wordlists')
          .select('id, wordlist_id, filtered_word_ids')
          .eq('parent_assignment_id', assignmentId)

        interface ChildAssignment {
          id: string
          wordlist_id: string
          filtered_word_ids: number[] | null
        }
        const children = childrenData as ChildAssignment[] | null

        // 2. 하위 배정 재귀 삭제
        if (children) {
          for (const child of children) {
            await deleteRecursively(child.id, child.wordlist_id, child.filtered_word_ids)
          }
        }

        // 3. 대상 단어 ID 목록 결정
        let targetWordIds = filteredWordIds || []
        if (targetWordIds.length === 0) {
          const { data: wordsData } = await supabase
            .from('words')
            .select('id')
            .eq('wordlist_id', wordlistId)

          if (wordsData) {
            targetWordIds = wordsData.map((w: { id: number }) => w.id)
          }
        }

        // 4. ⭐ student_word_progress 삭제 (해당 단어장의 단어들만)
        if (targetWordIds.length > 0) {
          await supabase
            .from('student_word_progress')
            .delete()
            .eq('student_id', studentId)
            .in('word_id', targetWordIds)
        }

        // 5. online_tests 삭제 (해당 assignment의 completed_wordlists에 연결된 것만)
        const { data: completedWordlistIds } = await supabase
          .from('completed_wordlists')
          .select('id')
          .eq('assignment_id', assignmentId)

        if (completedWordlistIds && completedWordlistIds.length > 0) {
          await supabase
            .from('online_tests')
            .delete()
            .eq('student_id', studentId)
            .in('completed_wordlist_id', completedWordlistIds.map((c: { id: string }) => c.id))
        }

        // 6. completed_wordlists 삭제
        await supabase.from('completed_wordlists').delete().eq('assignment_id', assignmentId)

        // 7. student_wordlists 삭제
        await supabase.from('student_wordlists').delete().eq('id', assignmentId)
      }

      await deleteRecursively(assignment.id, assignment.wordlist_id, assignment.filtered_word_ids)
      await loadAllData()
      onDataChanged?.()

    } catch (error) {
      console.error('삭제 실패:', error)
    } finally {
      setDeleting(false)
    }
  }

  // 복습 단어장 삭제 (wordlist 자체와 관련 데이터 모두 삭제)
  const handleDeleteReviewWordlist = async (wordlist: WordlistInfo) => {
    const message = `"${wordlist.name}" 복습 단어장을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 학습 기록도 함께 삭제됩니다.`

    if (!confirm(message)) return

    setDeleting(true)
    try {
      // 1. 해당 복습 단어장의 단어 ID 조회
      const { data: wordsData } = await supabase
        .from('words')
        .select('id')
        .eq('wordlist_id', wordlist.id)

      const wordIds = wordsData?.map((w: { id: number }) => w.id) || []

      // 2. 해당 복습 단어장의 배정 정보 조회
      const { data: assignmentsData } = await supabase
        .from('student_wordlists')
        .select('id')
        .eq('wordlist_id', wordlist.id)
        .eq('student_id', studentId)

      const assignmentIds = assignmentsData?.map((a: { id: string }) => a.id) || []

      // 3. student_word_progress 삭제
      if (wordIds.length > 0) {
        await supabase
          .from('student_word_progress')
          .delete()
          .eq('student_id', studentId)
          .in('word_id', wordIds)
      }

      // 4. online_tests 삭제 (completed_wordlists 기반)
      if (assignmentIds.length > 0) {
        const { data: completedWordlistIds } = await supabase
          .from('completed_wordlists')
          .select('id')
          .in('assignment_id', assignmentIds)

        if (completedWordlistIds && completedWordlistIds.length > 0) {
          await supabase
            .from('online_tests')
            .delete()
            .eq('student_id', studentId)
            .in('completed_wordlist_id', completedWordlistIds.map((c: { id: string }) => c.id))
        }

        // 5. completed_wordlists 삭제
        await supabase
          .from('completed_wordlists')
          .delete()
          .in('assignment_id', assignmentIds)

        // 6. student_wordlists 삭제
        await supabase
          .from('student_wordlists')
          .delete()
          .in('id', assignmentIds)
      }

      // 7. words 삭제
      if (wordIds.length > 0) {
        await supabase
          .from('words')
          .delete()
          .in('id', wordIds)
      }

      // 8. wordlists 삭제
      await supabase
        .from('wordlists')
        .delete()
        .eq('id', wordlist.id)

      await loadAllData()
      onDataChanged?.()

    } catch (error) {
      console.error('복습 단어장 삭제 실패:', error)
    } finally {
      setDeleting(false)
    }
  }

  const [savingGoal, setSavingGoal] = useState(false)

  // 입력 중에는 클램핑하지 않고 값만 설정
  const handleDailyGoalChange = (newGoal: number) => {
    setDailyGoal(newGoal)
  }

  // 저장 버튼 클릭 시 클램핑 및 DB 저장
  const saveDailyGoal = async () => {
    const clampedGoal = Math.max(5, Math.min(100, dailyGoal || 20))
    setDailyGoal(clampedGoal)
    setSavingGoal(true)

    try {
      // 1. users 테이블의 daily_goal 업데이트
      await (supabase as any)
        .from('users')
        .update({ daily_goal: clampedGoal })
        .eq('id', studentId)

      // 2. 해당 학생의 모든 student_wordlists의 daily_goal도 업데이트
      await (supabase as any)
        .from('student_wordlists')
        .update({ daily_goal: clampedGoal })
        .eq('student_id', studentId)

      // 3. 데이터 새로고침
      await loadAllData()
      onDataChanged?.()
    } catch (error) {
      console.error('회차목표 저장 실패:', error)
    } finally {
      setSavingGoal(false)
    }
  }

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const { assignment, stats, children } = node
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(assignment.id)

    const progressPercent = stats
      ? Math.round((stats.completed_words / assignment.total_words) * 100)
      : 0

    return (
      <div key={assignment.id} style={{ marginLeft: depth * 16 }}>
        <Card className={`mb-1.5 ${assignment.generation === 1 ? 'border-blue-200 bg-blue-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
          <CardContent className="p-2.5">
            {/* 헤더: 단어장 이름 + 삭제 버튼 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-5 w-5"
                    onClick={() => toggleExpand(assignment.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                {!hasChildren && <div className="w-5" />}

                {assignment.generation === 1 ? (
                  <BookOpen className="h-4 w-4 text-blue-600" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                )}

                <span className="text-sm font-medium">{assignment.wordlist_name}</span>
                <span className="text-xs text-muted-foreground">{assignment.total_words}개</span>
                <Badge variant={assignment.generation === 1 ? 'default' : 'outline'} className="text-xs h-5 px-1.5">
                  {assignment.generation === 1 ? '원본' : `G${assignment.generation}`}
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleDeleteAssignment(assignment)}
                disabled={deleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 진도 + 통계 한 줄 */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{progressPercent}% ({stats?.completed_words || 0}/{assignment.total_words})</span>
              <span>회차: {stats?.completed_sessions || 0}/{stats?.total_sessions || 0}</span>
              <span>O: {stats?.o_test_completed || 0}회</span>
              <span>X: {stats?.x_test_completed || 0}회</span>
            </div>
          </CardContent>
        </Card>

        {isExpanded && children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            학생 관리: {studentName}
          </DialogTitle>
        </DialogHeader>

        {/* 기본 정보 - 한 줄로 압축 */}
        <div className="shrink-0 flex items-center gap-4 py-3 px-1 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">이름:</span>
            <span className="font-medium">{studentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">회차목표:</span>
            <Select value={String(dailyGoal)} onValueChange={(v) => handleDailyGoalChange(parseInt(v))}>
              <SelectTrigger className="w-20 h-7 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 25, 30].map((num) => (
                  <SelectItem key={num} value={String(num)}>{num}개</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={saveDailyGoal}
              disabled={savingGoal}
            >
              {savingGoal ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              저장
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => window.open(`${baseUrl}/s/${accessToken}/dashboard`, '_blank')}
            >
              <Monitor className="h-3 w-3" />
              데스크톱
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => window.open(`${baseUrl}/s/${accessToken}/mobile/dashboard`, '_blank')}
            >
              <Smartphone className="h-3 w-3" />
              모바일
            </Button>
          </div>
        </div>

        {/* 2컬럼 레이아웃 */}
        <div className="flex-1 grid grid-cols-2 gap-3 mt-3 min-h-0">
          {/* 왼쪽 컬럼: 단어장 배정 */}
          <div className="border rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="shrink-0 px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
              <h3 className="font-medium text-sm flex items-center gap-2">
                📋 단어장 배정
              </h3>
              {saving && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  저장 중...
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* 원본 단어장 그룹 */}
                <div className="border-b">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border-b sticky top-0">
                    <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">원본 단어장</span>
                    <Badge variant="secondary" className="text-xs">
                      {allWordlists.filter(w => !w.is_review).length}개
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {allWordlists.filter(w => !w.is_review).map(wordlist => {
                      const isProcessing = pendingChanges.has(wordlist.id)

                      return (
                        <div
                          key={wordlist.id}
                          className={`flex items-center gap-1.5 py-1 px-2 hover:bg-muted/50 cursor-pointer ${isProcessing ? 'opacity-50' : ''}`}
                          onClick={() => !saving && handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Checkbox
                              checked={wordlist.isAssigned}
                              disabled={saving}
                              className="h-3.5 w-3.5"
                              onCheckedChange={() => handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs truncate block">{wordlist.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {wordlist.total_words}개
                          </span>
                          {wordlist.isAssigned && wordlist.progressPercent !== undefined && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {wordlist.progressPercent}%
                            </span>
                          )}
                          {!wordlist.isAssigned && !isProcessing && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              미배정
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 복습 단어장 그룹 */}
                {allWordlists.filter(w => w.is_review).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-orange-50 border-b sticky top-0">
                      <RefreshCw className="h-3.5 w-3.5 text-orange-600" />
                      <span className="text-xs font-medium text-orange-700">복습 단어장</span>
                      <span className="text-xs text-orange-600">
                        {allWordlists.filter(w => w.is_review).length}개
                      </span>
                    </div>
                    <div className="divide-y">
                      {allWordlists.filter(w => w.is_review).map(wordlist => {
                        const isProcessing = pendingChanges.has(wordlist.id)

                        return (
                          <div
                            key={wordlist.id}
                            className={`flex items-center gap-1.5 py-1 px-2 hover:bg-muted/50 ${isProcessing ? 'opacity-50' : ''}`}
                          >
                            <div
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() => !saving && handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              ) : (
                                <Checkbox
                                  checked={wordlist.isAssigned}
                                  disabled={saving}
                                  className="h-3.5 w-3.5"
                                  onCheckedChange={() => handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-xs truncate block">{wordlist.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {wordlist.total_words}개
                              </span>
                              {wordlist.isAssigned && wordlist.progressPercent !== undefined && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {wordlist.progressPercent}%
                                </span>
                              )}
                              {!wordlist.isAssigned && !isProcessing && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  미배정
                                </span>
                              )}
                            </div>
                            {/* 복습 단어장 삭제 버튼 */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteReviewWordlist(wordlist)
                              }}
                              disabled={saving || deleting}
                              title="복습 단어장 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽 컬럼: 배정된 단어장 상세 */}
          <div className="border rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="shrink-0 px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
              <h3 className="font-medium text-sm flex items-center gap-2">
                📊 배정된 단어장 상세
                <Badge variant="secondary">{assignments.length}개</Badge>
              </h3>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                배정된 단어장이 없습니다
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {assignments.map(node => renderTreeNode(node))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
