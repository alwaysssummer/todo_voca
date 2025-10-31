'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  LogOut,
  Plus,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Edit2,
  Check,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AddStudentDialog } from '@/components/teacher/add-student-dialog'
import { AssignWordlistDialog } from '@/components/teacher/assign-wordlist-dialog'
import { AddWordlistDialog } from '@/components/teacher/add-wordlist-dialog'
import { ViewWordlistDialog } from '@/components/teacher/view-wordlist-dialog'
import { Input } from '@/components/ui/input'

interface DashboardStats {
  totalStudents: number
  totalWordlists: number
  activeStudents: number
  avgProgress: number
}

interface Student {
  id: string
  name: string
  email: string
  progress: number
  completedSessions: number    // 학습 완료 회차
  totalSessions: number        // 학습 전체 회차
  oTestCompleted: number       // O-TEST 완료 회차
  xTestCompleted: number       // X-TEST 완료 회차
  accessToken: string
}

interface Wordlist {
  id: string  // UUID
  title: string
  totalWords: number
  assignedStudents: number
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [teacherName, setTeacherName] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalWordlists: 0,
    activeStudents: 0,
    avgProgress: 0
  })
  const [students, setStudents] = useState<Student[]>([])
  const [wordlists, setWordlists] = useState<Wordlist[]>([])
  const [loading, setLoading] = useState(true)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [assignWordlistOpen, setAssignWordlistOpen] = useState(false)
  const [addWordlistOpen, setAddWordlistOpen] = useState(false)
  const [viewWordlistOpen, setViewWordlistOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [selectedWordlist, setSelectedWordlist] = useState<Wordlist | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingWordlistId, setEditingWordlistId] = useState<string | null>(null)
  const [editingWordlistName, setEditingWordlistName] = useState('')
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editingStudentName, setEditingStudentName] = useState('')

  useEffect(() => {
    // 로그인 확인
    const teacherId = sessionStorage.getItem('teacher_id')
    const name = sessionStorage.getItem('teacher_name')
    
    if (!teacherId || !name) {
      router.push('/teacher/login')
      return
    }

    setTeacherName(name)
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    try {
      // 학생 데이터 가져오기
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, name, email, access_token, daily_goal')
        .eq('role', 'student')

      if (studentsError) throw studentsError

      // 각 학생의 진도 정보 계산
      const studentsWithProgress: Student[] = await Promise.all(
        (studentsData || []).map(async (student) => {
          // 1. 학습 완료 회차 (completed_wordlists)
          const { count: completedSessions } = await supabase
            .from('completed_wordlists')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)

          // 2. 학습 전체 회차 계산 (배정된 단어장의 총 회차)
          const { data: assignments } = await supabase
            .from('student_wordlists')
            .select('wordlist_id, daily_goal')
            .eq('student_id', student.id)

          let totalSessions = 0
          if (assignments && assignments.length > 0) {
            for (const assignment of assignments) {
              const { data: wordlist } = await supabase
                .from('wordlists')
                .select('total_words')
                .eq('id', assignment.wordlist_id)
                .single()
              
              if (wordlist && assignment.daily_goal > 0) {
                totalSessions += Math.ceil(wordlist.total_words / assignment.daily_goal)
              }
            }
          }

          // 3. O-TEST 완료 회차
          const { count: oTestCompleted } = await supabase
            .from('online_tests')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('test_type', 'known')

          // 4. X-TEST 완료 회차 (실제 완료 + 자동 완료)
          const { count: xTestCompletedReal } = await supabase
            .from('online_tests')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('test_type', 'unknown')

          // X-TEST 자동 완료 (unknown_word_ids가 0개인 회차)
          const { data: allCompleted } = await supabase
            .from('completed_wordlists')
            .select('unknown_word_ids')
            .eq('student_id', student.id)

          const autoCompleted = allCompleted?.filter(
            item => !item.unknown_word_ids || item.unknown_word_ids.length === 0
          ).length || 0

          const xTestCompleted = (xTestCompletedReal || 0) + autoCompleted

          // 5. 전체 진도 계산
          const { count: completedCount } = await supabase
            .from('student_word_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('status', 'completed')

          const { count: totalWords } = await supabase
            .from('words')
            .select('*', { count: 'exact', head: true })

          const progress = totalWords ? Math.round((completedCount || 0) / totalWords * 100) : 0

          return {
            id: student.id,
            name: student.name,
            email: student.email || '',
            progress: progress,
            completedSessions: completedSessions || 0,
            totalSessions: totalSessions,
            oTestCompleted: oTestCompleted || 0,
            xTestCompleted: xTestCompleted,
            accessToken: student.access_token
          }
        })
      )

      setStudents(studentsWithProgress)

      // 단어장 데이터 가져오기
      const { data: wordlistsData, error: wordlistsError } = await supabase
        .from('wordlists')
        .select('id, name, total_words')

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
            assignedStudents: assignedCount || 0
          }
        })
      )

      setWordlists(wordlistsWithCount)

      // 통계 계산
      const activeCount = studentsWithProgress.filter(s => s.completedSessions > 0).length
      const avgProg = studentsWithProgress.length > 0
        ? studentsWithProgress.reduce((sum, s) => sum + s.progress, 0) / studentsWithProgress.length
        : 0

      setStats({
        totalStudents: studentsWithProgress.length,
        totalWordlists: wordlistsWithCount.length,
        activeStudents: activeCount,
        avgProgress: Math.round(avgProg)
      })

      setLoading(false)
    } catch (err) {
      console.error('대시보드 데이터 로드 실패:', err)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('teacher_id')
    sessionStorage.removeItem('teacher_name')
    router.push('/teacher/login')
  }

  const openStudentDashboard = (token: string) => {
    const link = `${window.location.origin}/s/${token}/dashboard`
    window.open(link, '_blank')
  }

  const openAssignDialog = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId)
    setSelectedStudentName(studentName)
    setAssignWordlistOpen(true)
  }

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`"${studentName}" 학생을 삭제하시겠습니까?\n\n⚠️ 학생의 모든 학습 기록이 삭제됩니다.`)) {
      return
    }

    try {
      // 1. online_tests 삭제 (completed_wordlists 참조)
      const { error: testsError } = await supabase
        .from('online_tests')
        .delete()
        .eq('student_id', studentId)

      if (testsError) {
        console.error('온라인 테스트 삭제 실패:', testsError)
        throw new Error('온라인 테스트 삭제 중 오류가 발생했습니다')
      }

      // 2. offline_tests 삭제
      const { error: offlineError } = await supabase
        .from('offline_tests')
        .delete()
        .eq('student_id', studentId)

      if (offlineError) {
        console.error('오프라인 테스트 삭제 실패:', offlineError)
        throw new Error('오프라인 테스트 삭제 중 오류가 발생했습니다')
      }

      // 3. completed_wordlists 삭제
      const { error: completedError } = await supabase
        .from('completed_wordlists')
        .delete()
        .eq('student_id', studentId)

      if (completedError) {
        console.error('완성 단어장 삭제 실패:', completedError)
        throw new Error('완성 단어장 삭제 중 오류가 발생했습니다')
      }

      // 4. student_word_progress 삭제
      const { error: progressError } = await supabase
        .from('student_word_progress')
        .delete()
        .eq('student_id', studentId)

      if (progressError) {
        console.error('학습 진도 삭제 실패:', progressError)
        throw new Error('학습 진도 삭제 중 오류가 발생했습니다')
      }

      // 5. student_wordlists 삭제
      const { error: wordlistsError } = await supabase
        .from('student_wordlists')
        .delete()
        .eq('student_id', studentId)

      if (wordlistsError) {
        console.error('단어장 배정 삭제 실패:', wordlistsError)
        throw new Error('단어장 배정 삭제 중 오류가 발생했습니다')
      }

      // 6. 마지막으로 users 삭제
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId)

      if (userError) {
        console.error('사용자 삭제 실패:', userError)
        throw new Error('사용자 삭제 중 오류가 발생했습니다')
      }

      alert('학생이 삭제되었습니다.')
      loadDashboardData()
    } catch (err: any) {
      console.error('학생 삭제 실패:', err)
      alert(err.message || '학생 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteWordlist = async (wordlistId: string, wordlistName: string) => {
    // 1. 배정 여부 확인
    const { count: assignedCount } = await supabase
      .from('student_wordlists')
      .select('*', { count: 'exact', head: true })
      .eq('wordlist_id', wordlistId)

    // 2. 배정된 학생이 있으면 강력한 경고
    if (assignedCount && assignedCount > 0) {
      const confirmMessage = `⚠️ 위험: "${wordlistName}" 단어장은 ${assignedCount}명의 학생에게 배정되어 있습니다.\n\n삭제 시 다음 데이터가 모두 삭제됩니다:\n- 단어장의 모든 단어\n- ${assignedCount}명 학생의 학습 진도\n- ${assignedCount}명 학생의 완성 단어장\n- ${assignedCount}명 학생의 테스트 기록\n\n정말로 삭제하시겠습니까?`
      
      if (!confirm(confirmMessage)) {
        return
      }
      
      // 2차 확인
      const secondConfirm = confirm(`최종 확인: "${wordlistName}" 단어장과\n${assignedCount}명 학생의 모든 관련 데이터를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다!`)
      
      if (!secondConfirm) {
        return
      }
    } else {
      // 배정되지 않은 단어장은 일반 확인만
      if (!confirm(`"${wordlistName}" 단어장을 삭제하시겠습니까?\n\n⚠️ 모든 단어 데이터가 삭제됩니다.`)) {
        return
      }
    }

    try {
      // 3. 단어장 삭제 (모든 관련 데이터 CASCADE 삭제)
      const { error } = await supabase
        .from('wordlists')
        .delete()
        .eq('id', wordlistId)

      if (error) {
        console.error('단어장 삭제 실패:', error)
        throw new Error('단어장 삭제 중 오류가 발생했습니다')
      }

      alert('단어장이 삭제되었습니다.')
      loadDashboardData()
    } catch (err: any) {
      console.error('단어장 삭제 실패:', err)
      alert(err.message || '단어장 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEditWordlistName = (wordlistId: string, currentName: string) => {
    setEditingWordlistId(wordlistId)
    setEditingWordlistName(currentName)
  }

  const handleSaveWordlistName = async () => {
    if (!editingWordlistId || !editingWordlistName.trim()) {
      return
    }

    try {
      const { error } = await supabase
        .from('wordlists')
        .update({ name: editingWordlistName.trim() })
        .eq('id', editingWordlistId)

      if (error) throw error

      // 로컬 상태 업데이트
      setWordlists(wordlists.map(w => 
        w.id === editingWordlistId 
          ? { ...w, title: editingWordlistName.trim() }
          : w
      ))

      // 편집 모드 종료
      setEditingWordlistId(null)
      setEditingWordlistName('')
    } catch (err: any) {
      console.error('단어장 이름 변경 실패:', err)
      alert(err.message || '단어장 이름 변경 중 오류가 발생했습니다.')
    }
  }

  const handleCancelEdit = () => {
    setEditingWordlistId(null)
    setEditingWordlistName('')
  }

  const handleEditStudentName = (studentId: string, currentName: string) => {
    setEditingStudentId(studentId)
    setEditingStudentName(currentName)
  }

  const handleSaveStudentName = async () => {
    if (!editingStudentId || !editingStudentName.trim()) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ name: editingStudentName.trim() })
        .eq('id', editingStudentId)

      if (error) throw error

      // 로컬 상태 업데이트
      setStudents(students.map(s => 
        s.id === editingStudentId 
          ? { ...s, name: editingStudentName.trim() }
          : s
      ))

      // 편집 모드 종료
      setEditingStudentId(null)
      setEditingStudentName('')
    } catch (err: any) {
      console.error('학생 이름 변경 실패:', err)
      alert(err.message || '학생 이름 변경 중 오류가 발생했습니다.')
    }
  }

  const handleCancelStudentEdit = () => {
    setEditingStudentId(null)
    setEditingStudentName('')
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Todo Voca
                </h1>
                <p className="text-sm text-muted-foreground">
                  {teacherName} 선생님
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">전체 학생</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">단어장 수</p>
                  <p className="text-2xl font-bold">{stats.totalWordlists}</p>
                </div>
                <BookOpen className="w-8 h-8 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">평균 진도</p>
                  <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">활동률</p>
                  <p className="text-2xl font-bold">
                    {stats.totalStudents > 0 
                      ? Math.round((stats.activeStudents / stats.totalStudents) * 100)
                      : 0}%
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 학생 목록 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>학생 목록</CardTitle>
              <Button size="sm" className="gap-2" onClick={() => setAddStudentOpen(true)}>
                <Plus className="w-4 h-4" />
                학생 추가
              </Button>
            </div>
            {students.length > 0 && (
              <Input
                placeholder="학생 이름으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            )}
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 학생이 없습니다
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    {/* 좌측: 학생 기본 정보 */}
                    <div className="flex items-center gap-3">
                      {/* 학생 이름 - 편집 모드 */}
                      {editingStudentId === student.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingStudentName}
                            onChange={(e) => setEditingStudentName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveStudentName()
                              } else if (e.key === 'Escape') {
                                handleCancelStudentEdit()
                              }
                            }}
                            className="h-8 w-48"
                            autoFocus
                            onBlur={handleSaveStudentName}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={handleSaveStudentName}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            onClick={handleCancelStudentEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h3 className="font-semibold">{student.name}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditStudentName(student.id, student.name)}
                            title="이름 변경"
                          >
                            <Edit2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">{student.email}</span>
                    </div>

                    {/* 우측: 진행 상황 + 버튼 */}
                    <div className="flex items-center gap-3">
                      {/* 학습 진행 통계 */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <BookOpen className="w-3 h-3" />
                          {student.completedSessions}/{student.totalSessions}
                        </Badge>
                        
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {student.oTestCompleted}/{student.completedSessions}
                        </Badge>
                        
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          {student.xTestCompleted}/{student.completedSessions}
                        </Badge>
                        
                        <span className="text-sm font-medium">{student.progress}%</span>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignDialog(student.id, student.name)}
                          className="gap-2"
                        >
                          <BookOpen className="w-3 h-3" />
                          단어장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStudentDashboard(student.accessToken)}
                          className="gap-2"
                        >
                          <Eye className="w-3 h-3" />
                          DESK
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = `${window.location.origin}/s/${student.accessToken}/mobile/dashboard`
                            window.open(link, '_blank')
                          }}
                          className="gap-2"
                        >
                          <Eye className="w-3 h-3" />
                          MOBILE
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 단어장 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>단어장 목록</CardTitle>
              <Button 
                size="sm" 
                className="gap-2"
                onClick={() => setAddWordlistOpen(true)}
              >
                <Plus className="w-4 h-4" />
                단어장 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {wordlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 단어장이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {wordlists.map((wordlist) => (
                  <div 
                    key={wordlist.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* 단어장 이름 - 편집 모드 */}
                      {editingWordlistId === wordlist.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingWordlistName}
                            onChange={(e) => setEditingWordlistName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveWordlistName()
                              } else if (e.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                            className="h-8 w-64"
                            autoFocus
                            onBlur={handleSaveWordlistName}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={handleSaveWordlistName}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h3 className="font-semibold">{wordlist.title}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditWordlistName(wordlist.id, wordlist.title)}
                            title="이름 변경"
                          >
                            <Edit2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {wordlist.totalWords}개 단어
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {wordlist.assignedStudents}명 배정
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => {
                          setSelectedWordlist(wordlist)
                          setViewWordlistOpen(true)
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        DESK
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteWordlist(wordlist.id, wordlist.title)}
                        className={`gap-2 ${
                          wordlist.assignedStudents > 0 
                            ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                            : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                        }`}
                        title={
                          wordlist.assignedStudents > 0 
                            ? `⚠️ ${wordlist.assignedStudents}명에게 배정됨 (학습 기록 삭제됨)` 
                            : '단어장 삭제'
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 학생 추가 다이얼로그 */}
      <AddStudentDialog 
        open={addStudentOpen}
        onOpenChange={setAddStudentOpen}
        onSuccess={loadDashboardData}
      />

      {/* 단어장 배정 다이얼로그 */}
      <AssignWordlistDialog
        open={assignWordlistOpen}
        onOpenChange={setAssignWordlistOpen}
        studentId={selectedStudentId}
        studentName={selectedStudentName}
        onSuccess={loadDashboardData}
      />

      {/* 단어장 추가 다이얼로그 */}
      <AddWordlistDialog
        open={addWordlistOpen}
        onClose={() => setAddWordlistOpen(false)}
        onSuccess={loadDashboardData}
      />

      {/* 단어장 보기 다이얼로그 */}
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
    </div>
  )
}

