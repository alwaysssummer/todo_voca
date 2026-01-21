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
  Plus,
} from 'lucide-react'

interface StudentManagementDialogProps {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  accessToken: string
  onAssignWordlist: () => void // 단어장 배정 다이얼로그 열기
  onDataChanged?: () => void // 데이터 변경 시 부모 컴포넌트에 알림
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
  onAssignWordlist,
  onDataChanged,
}: StudentManagementDialogProps) {
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<TreeNode[]>([])
  const [dailyGoal, setDailyGoal] = useState<number>(20)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (open && studentId) {
      loadAssignments()
      loadStudentInfo()
    }
  }, [open, studentId])

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

  const loadAssignments = async () => {
    setLoading(true)
    try {
      // 1. 학생의 모든 배정 조회
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
        wordlists: {
          id: string
          name: string
          total_words: number
        } | null
      }

      const { data: rawData, error } = await supabase
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
          filtered_word_ids,
          wordlists (
            id,
            name,
            total_words
          )
        `)
        .eq('student_id', studentId)
        .order('assigned_at', { ascending: true })

      if (error) throw error

      const assignmentsData = rawData as unknown as AssignmentRow[]

      // 2. 각 배정의 통계 조회
      const statsPromises = (assignmentsData || []).map(async (assignment) => {
        const wordlistData = assignment.wordlists

        // 단어 수 계산 (filtered_word_ids가 있으면 그 개수, 아니면 total_words)
        const totalWords = assignment.filtered_word_ids?.length || wordlistData?.total_words || 0
        const totalSessions = Math.ceil(totalWords / (assignment.daily_goal || 20))

        // 완료한 회차 수
        const { count: completedSessions } = await supabase
          .from('completed_wordlists')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)

        // 완료한 단어 수
        const { count: completedWords } = await supabase
          .from('student_word_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('wordlist_id', assignment.wordlist_id)
          .eq('status', 'completed')

        // O-TEST 완료 회차
        const { count: oTestCompleted } = await supabase
          .from('online_tests')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)
          .eq('test_type', 'known')

        // X-TEST 완료 회차
        const { count: xTestCompleted } = await supabase
          .from('online_tests')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)
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

      // 3. 트리 구조로 변환
      const assignmentsList: AssignmentWithWordlist[] = (assignmentsData || []).map(a => {
        const wordlistData = a.wordlists as { id: string; name: string; total_words: number } | null
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

      const tree = buildTree(assignmentsList, statsMap)
      setAssignments(tree)

      // 모든 노드 펼치기
      const allIds = new Set(assignmentsList.map(a => a.id))
      setExpandedNodes(allIds)

    } catch (error) {
      console.error('배정 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildTree = (
    assignments: AssignmentWithWordlist[],
    statsMap: Map<string, AssignmentStats>
  ): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    // 모든 노드 생성
    assignments.forEach(assignment => {
      nodeMap.set(assignment.id, {
        assignment,
        stats: statsMap.get(assignment.id) || null,
        children: [],
      })
    })

    // 트리 구조 구성
    assignments.forEach(assignment => {
      const node = nodeMap.get(assignment.id)!
      if (assignment.parent_assignment_id && nodeMap.has(assignment.parent_assignment_id)) {
        // 부모가 있으면 부모의 children에 추가
        nodeMap.get(assignment.parent_assignment_id)!.children.push(node)
      } else if (assignment.generation === 1 || !assignment.parent_assignment_id) {
        // 원본이거나 부모가 없으면 루트에 추가
        roots.push(node)
      } else {
        // 부모가 삭제된 경우 루트에 추가
        roots.push(node)
      }
    })

    // 각 노드의 children을 generation 순으로 정렬
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => a.assignment.generation - b.assignment.generation)
      node.children.forEach(sortChildren)
    }
    roots.forEach(sortChildren)

    return roots
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
    const message = assignment.is_auto_generated
      ? `"${assignment.wordlist_name}" 배정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 학습 기록과 하위 복습 단어장도 함께 삭제됩니다.`
      : `"${assignment.wordlist_name}" 배정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 학습 기록이 삭제됩니다.`

    if (!confirm(message)) return

    setDeleting(true)
    try {
      // 자식 배정들도 함께 삭제 (재귀적으로)
      const deleteRecursively = async (assignmentId: string) => {
        // 자식 배정 찾기
        const { data: childrenData } = await supabase
          .from('student_wordlists')
          .select('id')
          .eq('parent_assignment_id', assignmentId)

        const children = childrenData as { id: string }[] | null

        // 자식들 먼저 삭제
        if (children) {
          for (const child of children) {
            await deleteRecursively(child.id)
          }
        }

        // 관련 데이터 삭제
        await supabase.from('online_tests').delete().eq('assignment_id', assignmentId)
        await supabase.from('completed_wordlists').delete().eq('assignment_id', assignmentId)

        // 배정 삭제
        await supabase.from('student_wordlists').delete().eq('id', assignmentId)
      }

      await deleteRecursively(assignment.id)

      // 목록 새로고침
      await loadAssignments()
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
            {/* 헤더 */}
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

            {/* 진도 */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">진도</span>
                <span className="font-medium">
                  {progressPercent}% ({stats?.completed_words || 0}/{assignment.total_words})
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* 통계 */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>회차: {stats?.completed_sessions || 0}/{stats?.total_sessions || 0}</span>
              <span>O-TEST: {stats?.o_test_completed || 0}회</span>
              <span>X-TEST: {stats?.x_test_completed || 0}회</span>
            </div>

            {/* 링크 */}
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

        {/* 자식 노드들 */}
        {isExpanded && children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              학생 관리: {studentName}
            </DialogTitle>
          </DialogHeader>

          {/* 기본 정보 */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">이름</label>
                  <div className="font-medium">{studentName}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">회차목표</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      value={dailyGoal}
                      onChange={(e) => handleDailyGoalChange(parseInt(e.target.value) || 20)}
                      className="w-20 h-8"
                    />
                    <span className="text-sm text-muted-foreground">개/회차</span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm text-muted-foreground">메인 링크</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">
                    {baseUrl}/s/{accessToken}/dashboard
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${baseUrl}/s/${accessToken}/dashboard`, 'main')}
                  >
                    {copiedLink === 'main' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 배정된 단어장 */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              배정된 단어장
              <Badge variant="secondary">{assignments.length}개</Badge>
            </h3>
            <Button size="sm" onClick={onAssignWordlist} className="gap-1.5">
              <Plus className="h-4 w-4" />
              단어장 배정
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : assignments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">배정된 단어장이 없습니다</p>
                <p className="text-sm mt-1">단어장을 배정해주세요</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {assignments.map(node => renderTreeNode(node))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
