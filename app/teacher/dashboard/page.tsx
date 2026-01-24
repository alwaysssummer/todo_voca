'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  LogOut,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User, Wordlist as WordlistDB } from '@/types/database'
import { AddStudentDialog } from '@/components/teacher/add-student-dialog'
import { AddWordlistDialog } from '@/components/teacher/add-wordlist-dialog'
import { ViewWordlistDialog } from '@/components/teacher/view-wordlist-dialog'
import { MergeWordlistDialog } from '@/components/teacher/merge-wordlist-dialog'
import { WholeVocabularyPrintModal } from '@/components/student/whole-vocabulary-print-modal'
import { StudentListPanel, Student, WordlistProgress } from '@/components/teacher/student-list-panel'
import { StudentDetailPanel } from '@/components/teacher/student-detail-panel'
import { WordlistManagementTab, Wordlist } from '@/components/teacher/wordlist-management-tab'

export default function TeacherDashboard() {
  const router = useRouter()

  // 메인 탭 상태
  const [mainTab, setMainTab] = useState<'students' | 'wordlists'>('students')

  // 데이터 상태
  const [students, setStudents] = useState<Student[]>([])
  const [wordlists, setWordlists] = useState<Wordlist[]>([])
  const [loading, setLoading] = useState(true)

  // 선택된 학생
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // 다이얼로그 상태
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [addWordlistOpen, setAddWordlistOpen] = useState(false)
  const [viewWordlistOpen, setViewWordlistOpen] = useState(false)
  const [selectedWordlist, setSelectedWordlist] = useState<Wordlist | null>(null)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeWordlistIds, setMergeWordlistIds] = useState<string[]>([])

  // 인쇄 모달
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printWordlistId, setPrintWordlistId] = useState('')
  const [printWordlistTitle, setPrintWordlistTitle] = useState('')

  // 데이터 로드
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // 학생 데이터
      type StudentData = Pick<User, 'id' | 'name' | 'email' | 'access_token' | 'daily_goal'> & { display_order?: number }
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, name, email, access_token, daily_goal, display_order')
        .eq('role', 'student')
        .order('display_order', { ascending: true })
        .returns<StudentData[]>()

      if (studentsError) throw studentsError

      // 각 학생의 단어장별 회차 정보 로딩
      const studentsWithWordlists: Student[] = await Promise.all(
        (studentsData || []).map(async (student) => {
          interface AssignmentWithWordlist {
            id: string
            current_session: number
            daily_goal: number
            wordlist: { id: string; name: string; total_words: number }
          }

          const { data: assignments } = await supabase
            .from('student_wordlists')
            .select(`id, current_session, daily_goal, wordlist:wordlists!inner(id, name, total_words)`)
            .eq('student_id', student.id)
            .eq('generation', 1)
            .returns<AssignmentWithWordlist[]>()

          const wordlistsProgress: WordlistProgress[] = (assignments || []).map((a) => {
            const totalSessions = a.daily_goal > 0 ? Math.ceil(a.wordlist.total_words / a.daily_goal) : 0
            return {
              id: a.id,
              name: a.wordlist.name,
              currentSession: a.current_session || 0,
              totalSessions: totalSessions
            }
          })

          // 최근 활동 시간
          const { data: lastProgress } = await supabase
            .from('student_word_progress')
            .select('updated_at')
            .eq('student_id', student.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single<{ updated_at: string }>()

          const { data: lastCompleted } = await supabase
            .from('completed_wordlists')
            .select('created_at')
            .eq('student_id', student.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single<{ created_at: string }>()

          let lastActivityAt: string | null = null
          if (lastProgress?.updated_at && lastCompleted?.created_at) {
            const progressDate = new Date(lastProgress.updated_at)
            const completedDate = new Date(lastCompleted.created_at)
            lastActivityAt = progressDate > completedDate ? lastProgress.updated_at : lastCompleted.created_at
          } else if (lastProgress?.updated_at) {
            lastActivityAt = lastProgress.updated_at
          } else if (lastCompleted?.created_at) {
            lastActivityAt = lastCompleted.created_at
          }

          return {
            id: student.id,
            name: student.name,
            email: student.email || '',
            accessToken: student.access_token,
            displayOrder: student.display_order || 0,
            lastActivityAt: lastActivityAt,
            wordlists: wordlistsProgress
          }
        })
      )

      setStudents(studentsWithWordlists)

      // 단어장 데이터
      type WordlistData = Pick<WordlistDB, 'id' | 'name' | 'total_words'> & { display_order?: number }
      const { data: wordlistsData, error: wordlistsError } = await supabase
        .from('wordlists')
        .select('id, name, total_words, display_order')
        .or('is_review.is.null,is_review.eq.false')
        .order('display_order', { ascending: true })
        .returns<WordlistData[]>()

      if (wordlistsError) throw wordlistsError

      const wordlistsWithCount: Wordlist[] = await Promise.all(
        (wordlistsData || []).map(async (wordlist) => {
          const { count: assignedCount } = await supabase
            .from('student_wordlists')
            .select('*', { count: 'exact', head: true })
            .eq('wordlist_id', wordlist.id)

          return {
            id: wordlist.id,
            title: wordlist.name,
            totalWords: wordlist.total_words,
            assignedStudents: assignedCount || 0,
            displayOrder: wordlist.display_order || 0
          }
        })
      )

      setWordlists(wordlistsWithCount)

      // 첫 번째 학생 자동 선택
      if (studentsWithWordlists.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsWithWordlists[0].id)
      }
    } catch (err) {
      console.error('대시보드 데이터 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedStudentId])

  useEffect(() => {
    loadDashboardData()
  }, [])

  // 로그아웃
  const handleLogout = () => {
    sessionStorage.removeItem('teacher_id')
    sessionStorage.removeItem('teacher_name')
    localStorage.removeItem('teacher_id')
    localStorage.removeItem('teacher_name')
    localStorage.removeItem('teacher_login_time')
    router.push('/teacher/login')
  }

  // 학생 삭제
  const handleDeleteStudents = async (studentIds: string[]) => {
    const selectedItems = students.filter(s => studentIds.includes(s.id))
    const studentNames = selectedItems.map(s => s.name).join(', ')

    if (!confirm(`${studentIds.length}명의 학생을 삭제하시겠습니까?\n\n학생: ${studentNames}\n\n⚠️ 모든 학습 기록이 삭제됩니다.`)) {
      return
    }

    try {
      for (const studentId of studentIds) {
        await supabase.from('online_tests').delete().eq('student_id', studentId)
        await supabase.from('offline_tests').delete().eq('student_id', studentId)
        await supabase.from('completed_wordlists').delete().eq('student_id', studentId)
        await supabase.from('student_word_progress').delete().eq('student_id', studentId)
        await supabase.from('student_wordlists').delete().eq('student_id', studentId)
        await supabase.from('users').delete().eq('id', studentId)
      }

      // 선택된 학생이 삭제된 경우 선택 해제
      if (selectedStudentId && studentIds.includes(selectedStudentId)) {
        setSelectedStudentId(null)
      }

      alert(`${studentIds.length}명의 학생이 삭제되었습니다.`)
      loadDashboardData()
    } catch (err: any) {
      console.error('학생 삭제 실패:', err)
      alert(err.message || '학생 삭제 중 오류가 발생했습니다.')
    }
  }

  // 단어장 삭제
  const handleDeleteWordlist = async (wordlistId: string, wordlistName: string) => {
    const { count: assignedCount } = await supabase
      .from('student_wordlists')
      .select('*', { count: 'exact', head: true })
      .eq('wordlist_id', wordlistId)

    let confirmMessage = `"${wordlistName}" 단어장을 삭제하시겠습니까?\n\n`
    if (assignedCount && assignedCount > 0) {
      confirmMessage += `⚠️ 경고: ${assignedCount}명의 학생에게 배정되어 있습니다.\n관련된 모든 학습 데이터가 삭제됩니다.`
    }

    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase.from('wordlists').delete().eq('id', wordlistId)
      if (error) throw error

      alert('단어장이 삭제되었습니다.')
      loadDashboardData()
    } catch (err: any) {
      console.error('단어장 삭제 실패:', err)
      alert(err.message || '단어장 삭제 중 오류가 발생했습니다.')
    }
  }

  // 단어장 통합
  const handleMergeWordlists = (wordlistIds: string[]) => {
    setMergeWordlistIds(wordlistIds)
    setMergeDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-2">
          <div className="flex items-center gap-4">
            {/* 로고 */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-blue-600 rounded flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Todo Voca
              </span>
            </div>

            {/* 메인 탭 */}
            <div className="flex gap-1 ml-4">
              <Button
                variant={mainTab === 'students' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-4 gap-2"
                onClick={() => setMainTab('students')}
              >
                <Users className="w-4 h-4" />
                학생관리
              </Button>
              <Button
                variant={mainTab === 'wordlists' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-4 gap-2"
                onClick={() => setMainTab('wordlists')}
              >
                <BookOpen className="w-4 h-4" />
                단어장관리
              </Button>
            </div>

            {/* 로그아웃 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-3 gap-2 ml-auto"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      {mainTab === 'students' ? (
        // 학생관리 탭: 마스터-디테일 레이아웃
        <div className="flex-1 flex overflow-hidden">
          {/* 좌측: 학생 목록 */}
          <div className="w-80 flex-shrink-0">
            <StudentListPanel
              students={students}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
              onAddStudent={() => setAddStudentOpen(true)}
              onDeleteStudents={handleDeleteStudents}
              loading={loading}
            />
          </div>

          {/* 우측: 학생 상세 */}
          <StudentDetailPanel studentId={selectedStudentId} />
        </div>
      ) : (
        // 단어장관리 탭
        <div className="flex-1 overflow-y-auto">
          <WordlistManagementTab
            wordlists={wordlists}
            onWordlistsChange={setWordlists}
            onAddWordlist={() => setAddWordlistOpen(true)}
            onViewWordlist={(wordlist) => {
              setSelectedWordlist(wordlist)
              setViewWordlistOpen(true)
            }}
            onPrintWordlist={(id, title) => {
              setPrintWordlistId(id)
              setPrintWordlistTitle(title)
              setPrintModalOpen(true)
            }}
            onDeleteWordlist={handleDeleteWordlist}
            onMergeWordlists={handleMergeWordlists}
            onRefresh={loadDashboardData}
          />
        </div>
      )}

      {/* 다이얼로그들 */}
      <AddStudentDialog
        open={addStudentOpen}
        onOpenChange={setAddStudentOpen}
        onSuccess={loadDashboardData}
      />

      <AddWordlistDialog
        open={addWordlistOpen}
        onClose={() => setAddWordlistOpen(false)}
        onSuccess={loadDashboardData}
      />

      <MergeWordlistDialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
        wordlistIds={mergeWordlistIds}
        onSuccess={() => {
          setMergeDialogOpen(false)
          setMergeWordlistIds([])
          loadDashboardData()
        }}
      />

      {selectedWordlist && (
        <ViewWordlistDialog
          open={viewWordlistOpen}
          onClose={() => {
            setViewWordlistOpen(false)
            setSelectedWordlist(null)
          }}
          wordlistId={selectedWordlist.id}
          wordlistTitle={selectedWordlist.title}
          totalWords={selectedWordlist.totalWords}
          assignedStudents={selectedWordlist.assignedStudents}
        />
      )}

      <WholeVocabularyPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        wordlistId={printWordlistId}
        title={printWordlistTitle}
      />
    </div>
  )
}
