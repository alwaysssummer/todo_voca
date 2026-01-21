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
  Loader2,
  Copy,
  Check,
  Trash2,
  BookOpen,
  RefreshCw,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Settings,
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
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
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
    const progressPromises = Array.from(assignedMap.entries()).map(async ([wordlistId, assignment]) => {
      const { count } = await supabase
        .from('student_word_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('wordlist_id', wordlistId)
        .eq('status', 'completed')

      return {
        wordlistId,
        assignmentId: assignment.id,
        completedWords: count || 0,
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

      const { count: completedWords } = await supabase
        .from('student_word_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('wordlist_id', assignment.wordlist_id)
        .eq('status', 'completed')

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
        // 배정 해제
        await supabase
          .from('student_wordlists')
          .delete()
          .eq('student_id', studentId)
          .eq('wordlist_id', wordlistId)
          .eq('generation', 1)
          .eq('is_auto_generated', false)
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

  const copyToClipboard = async (link: string, type: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(type)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (error) {
      console.error('복사 실패:', error)
    }
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
      const deleteRecursively = async (assignmentId: string) => {
        const { data: childrenData } = await supabase
          .from('student_wordlists')
          .select('id')
          .eq('parent_assignment_id', assignmentId)

        const children = childrenData as { id: string }[] | null

        if (children) {
          for (const child of children) {
            await deleteRecursively(child.id)
          }
        }

        await supabase.from('online_tests').delete().eq('student_id', studentId)
        await supabase.from('completed_wordlists').delete().eq('assignment_id', assignmentId)
        await supabase.from('student_wordlists').delete().eq('id', assignmentId)
      }

      await deleteRecursively(assignment.id)
      await loadAllData()
      onDataChanged?.()

    } catch (error) {
      console.error('삭제 실패:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleDailyGoalChange = async (newGoal: number) => {
    const clampedGoal = Math.max(5, Math.min(100, newGoal))
    setDailyGoal(clampedGoal)

    await (supabase as any)
      .from('users')
      .update({ daily_goal: clampedGoal })
      .eq('id', studentId)
  }

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const { assignment, stats, children } = node
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(assignment.id)

    const progressPercent = stats
      ? Math.round((stats.completed_words / assignment.total_words) * 100)
      : 0

    const desktopLink = `${baseUrl}/s/${accessToken}/dashboard`
    const mobileLink = `${baseUrl}/s/${accessToken}/mobile/dashboard`

    return (
      <div key={assignment.id} style={{ marginLeft: depth * 24 }}>
        <Card className={`mb-2 ${assignment.generation === 1 ? 'border-blue-200 bg-blue-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-6 w-6"
                    onClick={() => toggleExpand(assignment.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {!hasChildren && <div className="w-6" />}

                {assignment.generation === 1 ? (
                  <BookOpen className="h-5 w-5 text-blue-600" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                )}

                <span className="font-semibold">{assignment.wordlist_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {assignment.total_words}개
                </Badge>
                <Badge variant={assignment.generation === 1 ? 'default' : 'outline'} className="text-xs">
                  {assignment.generation === 1 ? '원본' : `G${assignment.generation}`}
                </Badge>
                {assignment.is_auto_generated && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                    <Settings className="h-3 w-3 mr-1" />
                    자동생성
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDeleteAssignment(assignment)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">진도</span>
                <span className="font-medium">
                  {progressPercent}% ({stats?.completed_words || 0}/{assignment.total_words})
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>회차: {stats?.completed_sessions || 0}/{stats?.total_sessions || 0}</span>
              <span>O-TEST: {stats?.o_test_completed || 0}회</span>
              <span>X-TEST: {stats?.x_test_completed || 0}회</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => copyToClipboard(desktopLink, `desktop-${assignment.id}`)}
              >
                <Monitor className="h-4 w-4" />
                데스크톱
                {copiedLink === `desktop-${assignment.id}` ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => copyToClipboard(mobileLink, `mobile-${assignment.id}`)}
              >
                <Smartphone className="h-4 w-4" />
                모바일
                {copiedLink === `mobile-${assignment.id}` ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
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
            <Input
              type="number"
              min={5}
              max={100}
              value={dailyGoal}
              onChange={(e) => handleDailyGoalChange(parseInt(e.target.value) || 20)}
              className="w-16 h-7 text-sm"
            />
            <span className="text-sm text-muted-foreground">개/회차</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-xs">
              {baseUrl}/s/{accessToken}/dashboard
            </code>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => copyToClipboard(`${baseUrl}/s/${accessToken}/dashboard`, 'main')}
            >
              {copiedLink === 'main' ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* 2컬럼 레이아웃 */}
        <div className="flex-1 grid grid-cols-2 gap-4 mt-4 min-h-0">
          {/* 왼쪽 컬럼: 단어장 배정 */}
          <div className="border rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="shrink-0 p-3 border-b bg-muted/50 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
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
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b sticky top-0">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">원본 단어장</span>
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
                          className={`flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer ${isProcessing ? 'opacity-50' : ''}`}
                          onClick={() => !saving && handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Checkbox
                              checked={wordlist.isAssigned}
                              disabled={saving}
                              onCheckedChange={() => handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{wordlist.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {wordlist.total_words}개
                          </Badge>
                          {wordlist.isAssigned && wordlist.progressPercent !== undefined && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {wordlist.progressPercent}%
                            </span>
                          )}
                          {!wordlist.isAssigned && !isProcessing && (
                            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                              미배정
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 복습 단어장 그룹 */}
                {allWordlists.filter(w => w.is_review).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-b sticky top-0">
                      <RefreshCw className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">복습 단어장</span>
                      <Badge variant="secondary" className="text-xs">
                        {allWordlists.filter(w => w.is_review).length}개
                      </Badge>
                    </div>
                    <div className="divide-y">
                      {allWordlists.filter(w => w.is_review).map(wordlist => {
                        const isProcessing = pendingChanges.has(wordlist.id)

                        return (
                          <div
                            key={wordlist.id}
                            className={`flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer ${isProcessing ? 'opacity-50' : ''}`}
                            onClick={() => !saving && handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Checkbox
                                checked={wordlist.isAssigned}
                                disabled={saving}
                                onCheckedChange={() => handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">{wordlist.name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {wordlist.total_words}개
                            </Badge>
                            {wordlist.isAssigned && wordlist.progressPercent !== undefined && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {wordlist.progressPercent}%
                              </span>
                            )}
                            {!wordlist.isAssigned && !isProcessing && (
                              <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                                미배정
                              </Badge>
                            )}
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
            <div className="shrink-0 p-3 border-b bg-muted/50 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
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
