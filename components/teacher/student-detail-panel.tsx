'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getKoreanNow, getKoreanToday, toKoreanDateString } from '@/lib/utils'
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
  User,
  Printer,
  FileText,
} from 'lucide-react'
import { ExamPrintModal } from '@/components/student/exam-print-modal'
import { VocabularyPrintModal } from '@/components/student/vocabulary-print-modal'

interface StudentDetailPanelProps {
  studentId: string | null
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

export function StudentDetailPanel({ studentId }: StudentDetailPanelProps) {
  const [loading, setLoading] = useState(false)
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

  // 우측 패널 탭 (학습기록 / 단어배정)
  const [rightPanelTab, setRightPanelTab] = useState<'records' | 'wordlists'>('records')

  // 학습기록 체크박스 선택
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())

  // 출력 모달
  const [examPrintOpen, setExamPrintOpen] = useState(false)
  const [examPrintType, setExamPrintType] = useState<'known' | 'unknown'>('known')
  const [vocabPrintOpen, setVocabPrintOpen] = useState(false)
  const [vocabPrintType, setVocabPrintType] = useState<'known' | 'unknown'>('known')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // 학생 정보 로드
  const loadStudentInfo = useCallback(async () => {
    if (!studentId) return

    const { data, error } = await supabase
      .from('users')
      .select('id, name, access_token, daily_goal')
      .eq('id', studentId)
      .single<StudentInfo>()

    if (!error && data) {
      setStudent(data)
      setDailyGoal(data.daily_goal || 20)
    }
  }, [studentId])

  // 학습 요약 통계 로드
  const loadSummaryStats = useCallback(async () => {
    if (!studentId) return

    const { count: totalCompleted } = await supabase
      .from('student_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'completed')

    const now = getKoreanNow()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    interface WeekSession { word_ids: number[] | null }
    const { data: weekSessions } = await supabase
      .from('completed_wordlists')
      .select('word_ids')
      .eq('student_id', studentId)
      .gte('completed_date', monday.toISOString())
      .returns<WeekSession[]>()

    const weeklyLearned = weekSessions?.reduce((sum, s) => sum + (s.word_ids?.length || 0), 0) || 0

    interface TestResult { correct_count: number | null; total_questions: number | null }
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

  // 주간 데이터 로드
  const loadWeeklyData = useCallback(async () => {
    if (!studentId) return

    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const today = getKoreanNow()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const weekData: WeeklyData[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      weekData.push({
        label: dayNames[day.getDay()],
        date: toKoreanDateString(day),
        count: 0
      })
    }

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    interface WeeklySession { completed_date: string; word_ids: number[] | null }
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
    if (!studentId) return

    interface WordlistRow {
      id: string
      name: string
      total_words: number
      is_review: boolean | null
    }

    const { data: originalWordlists } = await supabase
      .from('wordlists')
      .select('id, name, total_words, is_review')
      .or('is_review.is.null,is_review.eq.false')
      .order('display_order', { ascending: true })
      .returns<WordlistRow[]>()

    const { data: reviewWordlists } = await supabase
      .from('wordlists')
      .select('id, name, total_words, is_review')
      .eq('is_review', true)
      .eq('created_for_student_id', studentId)
      .order('created_at', { ascending: false })
      .returns<WordlistRow[]>()

    const allWl = [...(originalWordlists || []), ...(reviewWordlists || [])]

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
      .select(`id, wordlist_id, generation, is_auto_generated, base_wordlist_id, parent_assignment_id, daily_goal, current_session, filtered_word_ids`)
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: true })

    const assignmentsList = (assignmentsData as unknown as AssignmentRow[]) || []

    const assignedWordlistIds = new Set(
      assignmentsList.filter(a => a.generation === 1).map(a => a.wordlist_id)
    )

    const wordlistInfos: WordlistInfo[] = allWl.map(wl => ({
      id: wl.id,
      name: wl.name,
      total_words: wl.total_words,
      isAssigned: assignedWordlistIds.has(wl.id),
      is_review: wl.is_review || false
    }))

    setAllWordlists(wordlistInfos)
    await loadAssignmentsTree(assignmentsList, allWl)
  }, [studentId])

  // 배정 트리 구성
  const loadAssignmentsTree = async (
    assignmentsList: any[],
    wordlists: { id: string; name: string; total_words: number }[]
  ) => {
    if (!studentId) return

    const wordlistMap = new Map(wordlists.map(wl => [wl.id, wl]))

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
          o_test_completed: 0,
          x_test_completed: 0
        }
      })
    )

    // 트리 빌드
    const nodeMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    assignmentsWithStats.forEach(assignment => {
      nodeMap.set(assignment.id, { assignment, children: [] })
    })

    assignmentsWithStats.forEach(assignment => {
      const node = nodeMap.get(assignment.id)!
      if (assignment.parent_assignment_id && nodeMap.has(assignment.parent_assignment_id)) {
        nodeMap.get(assignment.parent_assignment_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    setAssignments(roots)
    setExpandedNodes(new Set(assignmentsWithStats.map(a => a.id)))

    if (assignmentsWithStats.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignmentsWithStats[0].id)
    }
  }

  // 학습 기록 로드
  const loadCompletedSessions = useCallback(async () => {
    if (!studentId) return

    interface SessionRow {
      id: string
      session_number: number
      assignment_id: string
      word_ids: number[]
      unknown_word_ids: number[] | null
      completed_date: string
      online_tests: { test_type: string; correct_count: number; total_questions: number }[] | null
    }

    const { data: sessions } = await supabase
      .from('completed_wordlists')
      .select(`id, session_number, assignment_id, word_ids, unknown_word_ids, completed_date, online_tests (test_type, correct_count, total_questions)`)
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
    if (!studentId) return

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
  }, [studentId, loadStudentInfo, loadSummaryStats, loadWeeklyData, loadWordlistsAndAssignments, loadCompletedSessions])

  useEffect(() => {
    if (studentId) {
      loadAllData()
    } else {
      setStudent(null)
      setAssignments([])
      setCompletedSessions([])
    }
  }, [studentId, loadAllData])

  // 단어장 배정/해제
  const handleToggleWordlist = async (wordlistId: string, currentlyAssigned: boolean) => {
    if (!studentId) return

    setSaving(true)
    try {
      const targetWordlist = allWordlists.find(w => w.id === wordlistId)
      const isReviewWordlist = targetWordlist?.is_review || false

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
          is_auto_generated: isReviewWordlist,
          base_wordlist_id: wordlistId,
          daily_goal: dailyGoal,
        })
      } else {
        const { data: assignmentData } = await supabase
          .from('student_wordlists')
          .select('id, wordlist_id, filtered_word_ids')
          .eq('student_id', studentId)
          .eq('wordlist_id', wordlistId)
          .eq('generation', 1)
          .single<{ id: string; wordlist_id: string; filtered_word_ids: number[] | null }>()

        if (assignmentData) {
          await supabase.from('student_wordlists').delete().eq('id', assignmentData.id)
        }
      }

      await loadAllData()
    } catch (error) {
      console.error('저장 실패:', error)
    } finally {
      setSaving(false)
    }
  }

  // 배정 삭제
  const handleDeleteAssignment = async (assignment: AssignmentWithStats) => {
    if (!confirm(`"${assignment.wordlist_name}" 배정을 삭제하시겠습니까?`)) return

    setDeleting(true)
    try {
      await supabase.from('student_wordlists').delete().eq('id', assignment.id)
      await loadAllData()
    } catch (error) {
      console.error('삭제 실패:', error)
    } finally {
      setDeleting(false)
    }
  }

  // 회차 목표 저장
  const saveDailyGoal = async () => {
    if (!studentId) return

    const clampedGoal = Math.max(5, Math.min(100, dailyGoal || 20))
    setDailyGoal(clampedGoal)
    setSavingGoal(true)

    try {
      await (supabase as any).from('users').update({ daily_goal: clampedGoal }).eq('id', studentId)
      await (supabase as any).from('student_wordlists').update({ daily_goal: clampedGoal }).eq('student_id', studentId)
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  // 선택된 단어장의 세션 필터링
  const filteredSessions = useMemo(() => {
    if (!selectedAssignmentId) return completedSessions.slice(0, 10)

    const selected = flatAssignments.find(a => a.id === selectedAssignmentId)
    if (!selected) return completedSessions.slice(0, 10)

    const baseId = selected.base_wordlist_id || selected.wordlist_id
    const relatedIds = flatAssignments
      .filter(a => (a.base_wordlist_id || a.wordlist_id) === baseId)
      .map(a => a.id)

    return completedSessions.filter(s => relatedIds.includes(s.assignment_id)).slice(0, 10)
  }, [selectedAssignmentId, completedSessions, flatAssignments])

  // 주간 그래프 최대값
  const maxWeeklyCount = useMemo(() => Math.max(...weeklyData.map(d => d.count), 1), [weeklyData])

  // 테이블 형태 데이터: 날짜 x 단어장별 회차 (세션 ID 포함)
  const sessionsTable = useMemo(() => {
    // 1. 단어장 목록 (base_wordlist_id 기준으로 그룹화)
    const wordlistMap = new Map<string, { id: string; name: string; assignmentIds: string[] }>()
    flatAssignments.forEach(a => {
      const baseId = a.base_wordlist_id || a.wordlist_id
      if (!wordlistMap.has(baseId)) {
        wordlistMap.set(baseId, {
          id: baseId,
          name: a.wordlist_name.length > 8 ? a.wordlist_name.slice(0, 8) + '..' : a.wordlist_name,
          assignmentIds: []
        })
      }
      wordlistMap.get(baseId)!.assignmentIds.push(a.id)
    })
    const wordlists = Array.from(wordlistMap.values())

    // 2. 날짜별 데이터 구성 (세션 ID 포함)
    interface CellData {
      sessionNumbers: number[]
      sessionIds: string[]
    }
    const dateMap = new Map<string, Map<string, CellData>>() // date -> wordlistId -> { sessionNumbers, sessionIds }

    completedSessions.forEach(session => {
      const date = new Date(session.completed_date)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map())
      }

      // 해당 세션의 단어장 찾기
      const assignment = flatAssignments.find(a => a.id === session.assignment_id)
      if (assignment) {
        const baseId = assignment.base_wordlist_id || assignment.wordlist_id
        if (!dateMap.get(dateKey)!.has(baseId)) {
          dateMap.get(dateKey)!.set(baseId, { sessionNumbers: [], sessionIds: [] })
        }
        const cellData = dateMap.get(dateKey)!.get(baseId)!
        cellData.sessionNumbers.push(session.session_number)
        cellData.sessionIds.push(session.id)
      }
    })

    // 3. 날짜 정렬 및 포맷
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const rows = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // 최신순
      .map(([dateKey, wordlistSessions]) => {
        const date = new Date(dateKey)
        // 해당 날짜의 모든 세션 ID 수집
        const allSessionIds: string[] = []
        wordlistSessions.forEach(cellData => {
          allSessionIds.push(...cellData.sessionIds)
        })
        return {
          date: dateKey,
          dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
          dayName: dayNames[date.getDay()],
          sessions: wordlistSessions,
          allSessionIds
        }
      })

    return { wordlists, rows }
  }, [completedSessions, flatAssignments])

  // 체크박스 선택 핸들러
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const toggleRowSelection = (sessionIds: string[]) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      const allSelected = sessionIds.every(id => prev.has(id))
      if (allSelected) {
        // 모두 선택됨 -> 해제
        sessionIds.forEach(id => next.delete(id))
      } else {
        // 일부 또는 전체 미선택 -> 전체 선택
        sessionIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const toggleCellSelection = (sessionIds: string[]) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      const allSelected = sessionIds.every(id => prev.has(id))
      if (allSelected) {
        sessionIds.forEach(id => next.delete(id))
      } else {
        sessionIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleAllSelection = () => {
    const allIds = sessionsTable.rows.flatMap(row => row.allSessionIds)
    setSelectedSessionIds(prev => {
      if (prev.size === allIds.length) {
        return new Set()
      }
      return new Set(allIds)
    })
  }

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
            <Button variant="ghost" size="sm" className="p-0 h-5 w-5" onClick={() => toggleExpand(assignment.id)}>
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          ) : <div className="w-5" />}

          <div className="flex-1 flex items-center gap-1.5 cursor-pointer" onClick={() => setSelectedAssignmentId(assignment.id)}>
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
            onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(assignment) }}
            disabled={deleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {isExpanded && children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    )
  }

  // 학생 미선택 시
  if (!studentId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>좌측에서 학생을 선택하세요</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">학생을 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 헤더: 이름 + 요약 통계 + 모바일 버튼 */}
      <div className="px-3 py-2 border-b bg-white flex items-center gap-3">
        <span className="text-lg font-semibold">{student.name}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold">{summaryStats.totalCompletedWords}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold">{summaryStats.weeklyLearned}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold">{summaryStats.avgAccuracy}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold">{formatRelativeTime(summaryStats.lastActivityAt)}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => window.open(`${baseUrl}/s/${student.access_token}/mobile/dashboard`, '_blank')}
        >
          <Smartphone className="h-3.5 w-3.5" />
          모바일
        </Button>
      </div>

      {/* 메인 콘텐츠: 좌우 분할 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 학생 iframe (65%) */}
        <div className="flex-[65] border-r overflow-hidden">
          <iframe
            src={`${baseUrl}/s/${student.access_token}/dashboard`}
            className="w-full h-full border-0"
            title="학생 대시보드"
          />
        </div>

        {/* 우측: 탭 패널 (35%) */}
        <div className="flex-[35] flex flex-col overflow-hidden bg-muted/10">
          {/* 탭 버튼 */}
          <div className="flex border-b bg-white">
            <button
              className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                rightPanelTab === 'records'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setRightPanelTab('records')}
            >
              📅 학습기록
            </button>
            <button
              className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                rightPanelTab === 'wordlists'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setRightPanelTab('wordlists')}
            >
              📚 단어배정
            </button>
          </div>

          {/* 탭 내용 */}
          <div className="flex-1 overflow-y-auto p-2">
            {rightPanelTab === 'records' ? (
              // 학습기록 탭 - 테이블 형태
              <div className="space-y-2">
                {/* 출력 버튼 영역 */}
                {selectedSessionIds.size > 0 && (
                  <div className="flex flex-wrap gap-1 p-2 bg-blue-50 rounded border border-blue-200">
                    <span className="text-xs text-blue-700 mr-1">{selectedSessionIds.size}개 선택</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => { setExamPrintType('known'); setExamPrintOpen(true) }}
                    >
                      <FileText className="h-3 w-3" />
                      O시험지
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => { setExamPrintType('unknown'); setExamPrintOpen(true) }}
                    >
                      <FileText className="h-3 w-3" />
                      X시험지
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => { setVocabPrintType('known'); setVocabPrintOpen(true) }}
                    >
                      <Printer className="h-3 w-3" />
                      O단어장
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => { setVocabPrintType('unknown'); setVocabPrintOpen(true) }}
                    >
                      <Printer className="h-3 w-3" />
                      X단어장
                    </Button>
                  </div>
                )}

                <div className="border rounded bg-white overflow-hidden">
                  {sessionsTable.rows.length === 0 || sessionsTable.wordlists.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">학습 기록이 없습니다</p>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-1 py-1.5 text-center font-medium border-b w-8">
                            <Checkbox
                              checked={selectedSessionIds.size > 0 && selectedSessionIds.size === sessionsTable.rows.flatMap(r => r.allSessionIds).length}
                              onCheckedChange={toggleAllSelection}
                              className="h-3 w-3"
                            />
                          </th>
                          <th className="px-1 py-1.5 text-left font-medium border-b">날짜</th>
                          {sessionsTable.wordlists.map((wl) => (
                            <th key={wl.id} className="px-1 py-1.5 text-center font-medium border-b">
                              {wl.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sessionsTable.rows.map((row) => {
                          const rowSelected = row.allSessionIds.length > 0 && row.allSessionIds.every(id => selectedSessionIds.has(id))
                          const rowIndeterminate = !rowSelected && row.allSessionIds.some(id => selectedSessionIds.has(id))

                          return (
                            <tr key={row.date} className={`hover:bg-muted/30 ${rowSelected ? 'bg-blue-50' : ''}`}>
                              <td className="px-1 py-1 text-center">
                                <Checkbox
                                  checked={rowSelected}
                                  ref={(el) => {
                                    if (el) (el as any).indeterminate = rowIndeterminate
                                  }}
                                  onCheckedChange={() => toggleRowSelection(row.allSessionIds)}
                                  className="h-3 w-3"
                                />
                              </td>
                              <td className="px-1 py-1 text-muted-foreground whitespace-nowrap">
                                {row.dateLabel}
                                <span className="text-[10px] ml-0.5">({row.dayName})</span>
                              </td>
                              {sessionsTable.wordlists.map((wl) => {
                                const cellData = row.sessions.get(wl.id)
                                const sessionNumbers = cellData?.sessionNumbers || []
                                const sessionIds = cellData?.sessionIds || []
                                const cellSelected = sessionIds.length > 0 && sessionIds.every(id => selectedSessionIds.has(id))
                                const cellIndeterminate = !cellSelected && sessionIds.some(id => selectedSessionIds.has(id))

                                return (
                                  <td key={wl.id} className={`px-1 py-1 text-center ${cellSelected ? 'bg-blue-100' : ''}`}>
                                    {sessionIds.length > 0 ? (
                                      <div
                                        className="flex items-center justify-center gap-1 cursor-pointer hover:bg-blue-50 rounded px-1"
                                        onClick={() => toggleCellSelection(sessionIds)}
                                      >
                                        <Checkbox
                                          checked={cellSelected}
                                          ref={(el) => {
                                            if (el) (el as any).indeterminate = cellIndeterminate
                                          }}
                                          onCheckedChange={() => toggleCellSelection(sessionIds)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-3 w-3"
                                        />
                                        <span className="text-blue-600 font-medium">
                                          {sessionNumbers.sort((a, b) => a - b).join(',')}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              // 단어배정 탭
              <div className="space-y-2">
                {/* 회차 목표 설정 */}
                <div className="flex items-center gap-2 p-2 bg-white rounded border">
                  <span className="text-xs text-muted-foreground">회차목표:</span>
                  <Select value={String(dailyGoal)} onValueChange={(v) => setDailyGoal(parseInt(v))}>
                    <SelectTrigger className="w-16 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 25, 30].map((num) => (
                        <SelectItem key={num} value={String(num)}>{num}개</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-6 px-2 gap-1" onClick={saveDailyGoal} disabled={savingGoal}>
                    {savingGoal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                </div>

                {/* 단어장 배정 체크리스트 */}
                <div className="border rounded bg-white overflow-hidden">
                  <div className="px-2 py-1.5 bg-muted/50 border-b text-xs font-medium flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    단어장
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {allWordlists.filter(w => !w.is_review).map(wordlist => (
                      <div
                        key={wordlist.id}
                        className="flex items-center gap-1.5 py-1 px-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                        onClick={() => !saving && handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                      >
                        <Checkbox checked={wordlist.isAssigned} disabled={saving} className="h-3.5 w-3.5" />
                        <span className="text-xs truncate flex-1">{wordlist.name}</span>
                        <span className="text-[10px] text-muted-foreground">{wordlist.total_words}개</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 복습 단어장 */}
                {allWordlists.filter(w => w.is_review).length > 0 && (
                  <div className="border rounded bg-white overflow-hidden border-orange-200">
                    <div className="px-2 py-1.5 bg-orange-50 border-b border-orange-200 text-xs font-medium text-orange-700 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      복습 단어장
                    </div>
                    <div className="max-h-[150px] overflow-y-auto">
                      {allWordlists.filter(w => w.is_review).map(wordlist => (
                        <div
                          key={wordlist.id}
                          className="flex items-center gap-1.5 py-1 px-2 hover:bg-orange-50 cursor-pointer border-b border-orange-100 last:border-b-0"
                          onClick={() => !saving && handleToggleWordlist(wordlist.id, wordlist.isAssigned)}
                        >
                          <Checkbox checked={wordlist.isAssigned} disabled={saving} className="h-3.5 w-3.5" />
                          <span className="text-xs truncate flex-1">{wordlist.name}</span>
                          <span className="text-[10px] text-muted-foreground">{wordlist.total_words}개</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 배정된 단어장 트리 */}
                {assignments.length > 0 && (
                  <div className="border rounded bg-white overflow-hidden">
                    <div className="px-2 py-1.5 bg-muted/50 border-b text-xs font-medium flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      배정 현황
                      <Badge variant="secondary" className="text-[10px] ml-auto">{flatAssignments.length}개</Badge>
                    </div>
                    <div className="p-2 max-h-[150px] overflow-y-auto">
                      {assignments.map(node => renderTreeNode(node))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 출력 모달 */}
      <ExamPrintModal
        open={examPrintOpen}
        onClose={() => setExamPrintOpen(false)}
        sessionIds={Array.from(selectedSessionIds)}
        type={examPrintType}
        title={`${student.name} - ${examPrintType === 'known' ? 'O' : 'X'} 테스트 (${selectedSessionIds.size}회차)`}
      />

      <VocabularyPrintModal
        open={vocabPrintOpen}
        onClose={() => setVocabPrintOpen(false)}
        sessionIds={Array.from(selectedSessionIds)}
        type={vocabPrintType}
        title={`${student.name} - ${vocabPrintType === 'known' ? '아는' : '모르는'} 단어장 (${selectedSessionIds.size}회차)`}
      />
    </div>
  )
}
