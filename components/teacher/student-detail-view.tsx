'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Loader2,
  Trash2,
  BookOpen,
  RefreshCw,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Save,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface StudentDetailViewProps {
  studentId: string
}

interface StudentInfo {
  id: string
  name: string
  access_token: string
  daily_goal: number
}

interface WordlistInfo {
  id: string
  name: string
  total_words: number
  isAssigned: boolean
  is_review?: boolean
}

interface AssignmentWithStats {
  id: string
  wordlist_id: string
  wordlist_name: string
  generation: number
  is_auto_generated: boolean
  base_wordlist_id: string | null
  parent_assignment_id: string | null
  daily_goal: number
  current_session: number
  total_words: number
  filtered_word_ids: number[] | null
  completed_words: number
  completed_sessions: number
  total_sessions: number
  o_test_completed: number
  x_test_completed: number
}

interface TreeNode {
  assignment: AssignmentWithStats
  children: TreeNode[]
}

interface CompletedSession {
  id: string
  session_number: number
  assignment_id: string
  word_count: number
  unknown_count: number
  completed_date: string
  o_test_completed: boolean
  o_test_correct: number
  o_test_total: number
  x_test_completed: boolean
  x_test_correct: number
  x_test_total: number
}

interface SummaryStats {
  totalCompletedWords: number
  weeklyLearned: number
  avgAccuracy: number
  lastActivityAt: string | null
}

interface WeeklyData {
  label: string
  date: string
  count: number
}

export function StudentDetailView({ studentId }: StudentDetailViewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalCompletedWords: 0,
    weeklyLearned: 0,
    avgAccuracy: 0,
    lastActivityAt: null
  })
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])

  // 단어장 관리
  const [assignments, setAssignments] = useState<TreeNode[]>([])
  const [allWordlists, setAllWordlists] = useState<WordlistInfo[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [dailyGoal, setDailyGoal] = useState<number>(20)
  const [savingGoal, setSavingGoal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 학습 현황
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'all' | 'week' | 'month'>('all')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // 학생 기본 정보 로드
  const loadStudentInfo = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, access_token, daily_goal')
      .eq('id', studentId)
      .single<StudentInfo>()

    if (error) {
      console.error('학생 정보 로드 실패:', error)
      return
    }

    if (data) {
      setStudent(data)
      setDailyGoal(data.daily_goal || 20)
    }
  }, [studentId])

  // 학습 요약 통계 로드
  const loadSummaryStats = useCallback(async () => {
    // 총 완료 단어 수
    const { count: totalCompleted } = await supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'completed')

    // 이번 주 학습량 (completed_wordlists 기준)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    interface WeekSession {
      word_ids: number[] | null
    }

    const { data: weekSessions } = await supabase
      .from('completed_wordlists')
      .select('word_ids')
      .eq('student_id', studentId)
      .gte('completed_date', monday.toISOString())
      .returns<WeekSession[]>()

    const weeklyLearned = weekSessions?.reduce((sum, s) => sum + (s.word_ids?.length || 0), 0) || 0

    // 평균 정답률 (online_tests 기준)
    interface TestResult {
      correct_count: number | null
      total_questions: number | null
    }

    const { data: tests } = await supabase
      .from('online_tests')
      .select('correct_count, total_questions')
      .eq('student_id', studentId)
      .returns<TestResult[]>()

    let avgAccuracy = 0
    if (tests && tests.length > 0) {
      const totalCorrect = tests.reduce((sum, t) => sum + (t.correct_count || 0), 0)
      const totalQuestions = tests.reduce((sum, t) => sum + (t.total_questions || 0), 0)
      avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
    }

    // 최근 활동
    const { data: lastSession } = await supabase
      .from('completed_wordlists')
      .select('completed_date')
      .eq('student_id', studentId)
      .order('completed_date', { ascending: false })
      .limit(1)
      .single<{ completed_date: string }>()

    setSummaryStats({
      totalCompletedWords: totalCompleted || 0,
      weeklyLearned,
      avgAccuracy,
      lastActivityAt: lastSession?.completed_date || null
    })
  }, [studentId])

  // 주간 학습량 그래프 데이터 로드
  const loadWeeklyData = useCallback(async () => {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const weekData: WeeklyData[] = []

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      const dateStr = day.toISOString().split('T')[0]

      weekData.push({
        label: dayNames[day.getDay()],
        date: dateStr,
        count: 0
      })
    }

    // 이번 주 완료된 세션 조회
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    interface WeeklySession {
      completed_date: string
      word_ids: number[] | null
    }

    const { data: sessions } = await supabase
      .from('completed_wordlists')
      .select('completed_date, word_ids')
      .eq('student_id', studentId)
      .gte('completed_date', monday.toISOString())
      .lte('completed_date', sunday.toISOString())
      .returns<WeeklySession[]>()

    sessions?.forEach(session => {
      const sessionDate = session.completed_date.split('T')[0]
      const dayData = weekData.find(d => d.date === sessionDate)
      if (dayData) {
        dayData.count += session.word_ids?.length || 0
      }
    })

    setWeeklyData(weekData)
  }, [studentId])

  // 단어장 및 배정 정보 로드
  const loadWordlistsAndAssignments = useCallback(async () => {
    interface WordlistRow {
      id: string
      name: string
      total_words: number
      is_review: boolean | null
    }

    // 원본 단어장 조회
    const { data: originalWordlists } = await supabase
      .from('wordlists')
      .select('id, name, total_words, is_review')
      .or('is_review.is.null,is_review.eq.false')
      .order('display_order', { ascending: true })
      .returns<WordlistRow[]>()

    // 복습 단어장 조회 (해당 학생용만)
    const { data: reviewWordlists } = await supabase
      .from('wordlists')
      .select('id, name, total_words, is_review')
      .eq('is_review', true)
      .eq('created_for_student_id', studentId)
      .order('created_at', { ascending: false })
      .returns<WordlistRow[]>()

    const allWl = [...(originalWordlists || []), ...(reviewWordlists || [])]

    // 배정 정보 조회
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

    // 배정된 단어장 ID Set
    const assignedWordlistIds = new Set(
      assignmentsList
        .filter(a => a.generation === 1 && !a.is_auto_generated)
        .map(a => a.wordlist_id)
    )

    // 단어장 목록 구성
    const wordlistInfos: WordlistInfo[] = allWl.map(wl => ({
      id: wl.id,
      name: wl.name,
      total_words: wl.total_words,
      isAssigned: assignedWordlistIds.has(wl.id),
      is_review: wl.is_review || false
    }))

    setAllWordlists(wordlistInfos)

    // 배정된 단어장 트리 구성
    await loadAssignmentsTree(assignmentsList, allWl)
  }, [studentId])

  // 배정 트리 구성
  const loadAssignmentsTree = async (
    assignmentsList: any[],
    wordlists: { id: string; name: string; total_words: number }[]
  ) => {
    const wordlistMap = new Map(wordlists.map(wl => [wl.id, wl]))

    // 통계 조회
    const assignmentsWithStats: AssignmentWithStats[] = await Promise.all(
      assignmentsList.map(async (assignment) => {
        const wordlistData = wordlistMap.get(assignment.wordlist_id)
        const totalWords = assignment.filtered_word_ids?.length || wordlistData?.total_words || 0
        const totalSessions = Math.ceil(totalWords / (assignment.daily_goal || 20))

        const { count: completedSessions } = await supabase
          .from('completed_wordlists')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)

        let targetWordIds = assignment.filtered_word_ids || []
        if (targetWordIds.length === 0 && wordlistData) {
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
          id: assignment.id,
          wordlist_id: assignment.wordlist_id,
          wordlist_name: wordlistData?.name || '알 수 없음',
          generation: assignment.generation || 1,
          is_auto_generated: assignment.is_auto_generated || false,
          base_wordlist_id: assignment.base_wordlist_id,
          parent_assignment_id: assignment.parent_assignment_id,
          daily_goal: assignment.daily_goal || 20,
          current_session: assignment.current_session || 1,
          total_words: totalWords,
          filtered_word_ids: assignment.filtered_word_ids,
          completed_words: completedWords || 0,
          completed_sessions: completedSessions || 0,
          total_sessions: totalSessions,
          o_test_completed: oTestCompleted || 0,
          x_test_completed: xTestCompleted || 0
        }
      })
    )

    // 트리 빌드
    const nodeMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    assignmentsWithStats.forEach(assignment => {
      nodeMap.set(assignment.id, {
        assignment,
        children: []
      })
    })

    assignmentsWithStats.forEach(assignment => {
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

    setAssignments(roots)
    setExpandedNodes(new Set(assignmentsWithStats.map(a => a.id)))

    // 첫 번째 배정 선택
    if (assignmentsWithStats.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignmentsWithStats[0].id)
    }
  }

  // 학습 기록 로드
  const loadCompletedSessions = useCallback(async () => {
    interface SessionRow {
      id: string
      session_number: number
      assignment_id: string
      word_ids: number[]
      unknown_word_ids: number[] | null
      completed_date: string
      online_tests: {
        test_type: string
        correct_count: number
        total_questions: number
      }[] | null
    }

    const { data: sessions } = await supabase
      .from('completed_wordlists')
      .select(`
        id,
        session_number,
        assignment_id,
        word_ids,
        unknown_word_ids,
        completed_date,
        online_tests (
          test_type,
          correct_count,
          total_questions
        )
      `)
      .eq('student_id', studentId)
      .order('session_number', { ascending: false })
      .returns<SessionRow[]>()

    const formattedSessions: CompletedSession[] = (sessions || []).map(session => {
      const oTest = session.online_tests?.find(t => t.test_type === 'known')
      const xTest = session.online_tests?.find(t => t.test_type === 'unknown')

      return {
        id: session.id,
        session_number: session.session_number,
        assignment_id: session.assignment_id,
        word_count: session.word_ids?.length || 0,
        unknown_count: session.unknown_word_ids?.length || 0,
        completed_date: session.completed_date,
        o_test_completed: !!oTest,
        o_test_correct: oTest?.correct_count ?? 0,
        o_test_total: oTest?.total_questions ?? 0,
        x_test_completed: !!xTest,
        x_test_correct: xTest?.correct_count ?? 0,
        x_test_total: xTest?.total_questions ?? 0
      }
    })

    setCompletedSessions(formattedSessions)
  }, [studentId])

  // 전체 데이터 로드
  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStudentInfo(),
        loadSummaryStats(),
        loadWeeklyData(),
        loadWordlistsAndAssignments(),
        loadCompletedSessions()
      ])
    } finally {
      setLoading(false)
    }
  }, [loadStudentInfo, loadSummaryStats, loadWeeklyData, loadWordlistsAndAssignments, loadCompletedSessions])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // 단어장 배정/해제
  const handleToggleWordlist = async (wordlistId: string, currentlyAssigned: boolean) => {
    setSaving(true)
    try {
      if (!currentlyAssigned) {
        const { data: teacherData } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'teacher')
          .limit(1)
          .single<{ id: string }>()

        await (supabase as any).from('student_wordlists').insert({
          student_id: studentId,
          wordlist_id: wordlistId,
          assigned_by: teacherData?.id,
          generation: 1,
          is_auto_generated: false,
          base_wordlist_id: wordlistId,
          daily_goal: dailyGoal,
        })
      } else {
        // 배정 해제 - 재귀 삭제
        interface AssignmentInfo {
          id: string
          wordlist_id: string
          filtered_word_ids: number[] | null
        }

        const { data: assignmentData } = await supabase
          .from('student_wordlists')
          .select('id, wordlist_id, filtered_word_ids')
          .eq('student_id', studentId)
          .eq('wordlist_id', wordlistId)
          .eq('generation', 1)
          .eq('is_auto_generated', false)
          .single<AssignmentInfo>()

        if (assignmentData) {
          await deleteAssignmentRecursively(assignmentData.id, assignmentData.wordlist_id, assignmentData.filtered_word_ids)
        }
      }

      await loadAllData()
    } catch (error) {
      console.error('저장 실패:', error)
    } finally {
      setSaving(false)
    }
  }

  // 재귀적 배정 삭제
  const deleteAssignmentRecursively = async (
    assignmentId: string,
    wordlistId: string,
    filteredWordIds: number[] | null
  ) => {
    interface ChildAssignment {
      id: string
      wordlist_id: string
      filtered_word_ids: number[] | null
    }

    const { data: children } = await supabase
      .from('student_wordlists')
      .select('id, wordlist_id, filtered_word_ids')
      .eq('parent_assignment_id', assignmentId)
      .returns<ChildAssignment[]>()

    if (children) {
      for (const child of children) {
        await deleteAssignmentRecursively(child.id, child.wordlist_id, child.filtered_word_ids)
      }
    }

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

    if (targetWordIds.length > 0) {
      await supabase
        .from('student_word_progress')
        .delete()
        .eq('student_id', studentId)
        .in('word_id', targetWordIds)
    }

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

    await supabase.from('completed_wordlists').delete().eq('assignment_id', assignmentId)
    await supabase.from('student_wordlists').delete().eq('id', assignmentId)
  }

  // 배정 삭제
  const handleDeleteAssignment = async (assignment: AssignmentWithStats) => {
    if (!confirm(`"${assignment.wordlist_name}" 배정을 삭제하시겠습니까?\n\n관련된 모든 학습 기록도 함께 삭제됩니다.`)) return

    setDeleting(true)
    try {
      await deleteAssignmentRecursively(assignment.id, assignment.wordlist_id, assignment.filtered_word_ids)
      await loadAllData()
    } catch (error) {
      console.error('삭제 실패:', error)
    } finally {
      setDeleting(false)
    }
  }

  // 회차 목표 저장
  const saveDailyGoal = async () => {
    const clampedGoal = Math.max(5, Math.min(100, dailyGoal || 20))
    setDailyGoal(clampedGoal)
    setSavingGoal(true)

    try {
      await (supabase as any)
        .from('users')
        .update({ daily_goal: clampedGoal })
        .eq('id', studentId)

      await (supabase as any)
        .from('student_wordlists')
        .update({ daily_goal: clampedGoal })
        .eq('student_id', studentId)

      await loadAllData()
    } catch (error) {
      console.error('회차목표 저장 실패:', error)
    } finally {
      setSavingGoal(false)
    }
  }

  // 트리 노드 토글
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

  // 선택된 단어장의 세션 필터링
  const filteredSessions = useMemo(() => {
    if (!selectedAssignmentId) return completedSessions

    // 선택된 배정 찾기
    const findAssignment = (nodes: TreeNode[]): AssignmentWithStats | null => {
      for (const node of nodes) {
        if (node.assignment.id === selectedAssignmentId) return node.assignment
        const found = findAssignment(node.children)
        if (found) return found
      }
      return null
    }

    const selected = findAssignment(assignments)
    if (!selected) return completedSessions

    // 같은 base_wordlist_id를 가진 모든 assignment ID 수집
    const baseId = selected.base_wordlist_id || selected.wordlist_id
    const collectRelatedIds = (nodes: TreeNode[]): string[] => {
      let ids: string[] = []
      for (const node of nodes) {
        const nodeBaseId = node.assignment.base_wordlist_id || node.assignment.wordlist_id
        if (nodeBaseId === baseId) {
          ids.push(node.assignment.id)
        }
        ids = [...ids, ...collectRelatedIds(node.children)]
      }
      return ids
    }

    const relatedIds = collectRelatedIds(assignments)
    return completedSessions.filter(s => relatedIds.includes(s.assignment_id))
  }, [selectedAssignmentId, completedSessions, assignments])

  // 모든 배정 평면 목록
  const flatAssignments = useMemo(() => {
    const result: AssignmentWithStats[] = []
    const flatten = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        result.push(node.assignment)
        flatten(node.children)
      })
    }
    flatten(assignments)
    return result
  }, [assignments])

  // 주간 그래프 최대값
  const maxWeeklyCount = useMemo(() => {
    return Math.max(...weeklyData.map(d => d.count), 1)
  }, [weeklyData])

  // 상대적 시간 포맷
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 트리 노드 렌더링
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const { assignment, children } = node
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(assignment.id)
    const progressPercent = Math.round((assignment.completed_words / assignment.total_words) * 100)

    return (
      <div key={assignment.id} style={{ marginLeft: depth * 12 }}>
        <div className={`flex items-center gap-1.5 p-1.5 rounded hover:bg-muted/50 ${
          selectedAssignmentId === assignment.id ? 'bg-blue-50 border border-blue-200' : ''
        }`}>
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-5 w-5"
              onClick={() => toggleExpand(assignment.id)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          ) : (
            <div className="w-5" />
          )}

          <div
            className="flex-1 flex items-center gap-1.5 cursor-pointer"
            onClick={() => setSelectedAssignmentId(assignment.id)}
          >
            {assignment.generation === 1 ? (
              <BookOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-orange-600 shrink-0" />
            )}
            <span className="text-xs font-medium truncate">{assignment.wordlist_name}</span>
            <Badge variant={assignment.generation === 1 ? 'default' : 'outline'} className="text-[10px] h-4 px-1">
              {assignment.generation === 1 ? '원본' : `G${assignment.generation}`}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <span>{progressPercent}%</span>
            <span>({assignment.completed_sessions}/{assignment.total_sessions})</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteAssignment(assignment)
            }}
            disabled={deleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {isExpanded && children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">학생을 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => router.push('/teacher/dashboard')}
              >
                <ArrowLeft className="h-4 w-4" />
                목록
              </Button>
              <div className="h-5 w-px bg-border" />
              <span className="text-lg font-semibold">{student.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(`${baseUrl}/s/${student.access_token}/mobile/dashboard`, '_blank')}
              >
                <Smartphone className="h-4 w-4" />
                모바일
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(`${baseUrl}/s/${student.access_token}/dashboard`, '_blank')}
              >
                <Monitor className="h-4 w-4" />
                학생화면
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* 학습 요약 카드 */}
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">총 학습</span>
              </div>
              <p className="text-2xl font-bold">{summaryStats.totalCompletedWords}</p>
              <p className="text-xs text-muted-foreground">단어</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">이번 주</span>
              </div>
              <p className="text-2xl font-bold">{summaryStats.weeklyLearned}</p>
              <p className="text-xs text-muted-foreground">단어</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">평균 정답률</span>
              </div>
              <p className="text-2xl font-bold">{summaryStats.avgAccuracy}%</p>
              <p className="text-xs text-muted-foreground">테스트 기준</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">최근 활동</span>
              </div>
              <p className="text-2xl font-bold">{formatRelativeTime(summaryStats.lastActivityAt)}</p>
              <p className="text-xs text-muted-foreground">&nbsp;</p>
            </CardContent>
          </Card>
        </div>

        {/* 메인 2컬럼 레이아웃 */}
        <div className="grid grid-cols-3 gap-4">
          {/* 좌측: 단어장 관리 */}
          <Card className="col-span-1">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>단어장 관리</span>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* 회차 목표 설정 */}
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <span className="text-xs text-muted-foreground">회차목표:</span>
                <Select value={String(dailyGoal)} onValueChange={(v) => setDailyGoal(parseInt(v))}>
                  <SelectTrigger className="w-20 h-7 text-xs">
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
                  {savingGoal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>

              {/* 배정된 단어장 트리 */}
              <div className="border rounded p-2 max-h-[300px] overflow-y-auto">
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" />
                  배정된 단어장
                  <Badge variant="secondary" className="text-[10px] ml-auto">{flatAssignments.length}개</Badge>
                </div>
                {assignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">배정된 단어장이 없습니다</p>
                ) : (
                  assignments.map(node => renderTreeNode(node))
                )}
              </div>

              {/* 단어장 배정 */}
              <div className="border rounded p-2 max-h-[250px] overflow-y-auto">
                <div className="text-xs font-medium text-muted-foreground mb-2">단어장 배정</div>
                {allWordlists.filter(w => !w.is_review).map(wordlist => (
                  <div
                    key={wordlist.id}
                    className="flex items-center gap-1.5 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => !saving && handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                  >
                    <Checkbox
                      checked={wordlist.isAssigned}
                      disabled={saving}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs truncate flex-1">{wordlist.name}</span>
                    <span className="text-[10px] text-muted-foreground">{wordlist.total_words}개</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 우측: 학습 현황 */}
          <Card className="col-span-2">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>학습 현황</span>
                  {flatAssignments.length > 0 && (
                    <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                      <SelectTrigger className="w-[200px] h-7 text-xs">
                        <SelectValue placeholder="단어장 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {flatAssignments.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            {a.wordlist_name} {a.generation > 1 ? `(G${a.generation})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant={viewMode === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('all')}
                    className="h-6 px-2 text-xs"
                  >
                    A
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('week')}
                    className="h-6 px-2 text-xs"
                  >
                    W
                  </Button>
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('month')}
                    className="h-6 px-2 text-xs"
                  >
                    M
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {/* 회차 목록 */}
              <div className="max-h-[350px] overflow-y-auto space-y-1.5">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">학습 기록이 없습니다</p>
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm w-8">
                          {String(session.session_number).padStart(2, '0')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.completed_date).getMonth() + 1}/{new Date(session.completed_date).getDate()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* O-TEST */}
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs">{session.word_count}</span>
                          {session.o_test_completed ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-green-600 border-green-200">
                              {session.o_test_correct}/{session.o_test_total}
                            </Badge>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-200" />
                          )}
                        </div>

                        {/* X-TEST */}
                        <div className="flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-orange-600" />
                          <span className="text-xs">{session.unknown_count}</span>
                          {session.unknown_count === 0 ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-orange-600 border-orange-200">
                              0/0
                            </Badge>
                          ) : session.x_test_completed ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-orange-600 border-orange-200">
                              {session.x_test_correct}/{session.x_test_total}
                            </Badge>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 주간 학습량 그래프 */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-3">주간 학습량</div>
                <div className="space-y-1.5">
                  {weeklyData.map((day, idx) => {
                    const today = new Date().toISOString().split('T')[0]
                    const isToday = day.date === today

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-4 text-xs ${isToday ? 'font-bold text-blue-600' : 'text-muted-foreground'}`}>
                          {day.label}
                        </span>
                        <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${isToday ? 'bg-blue-500' : 'bg-blue-400'}`}
                            style={{ width: `${(day.count / maxWeeklyCount) * 100}%` }}
                          />
                        </div>
                        <span className={`w-8 text-right text-xs ${isToday ? 'font-bold' : ''}`}>
                          {day.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
