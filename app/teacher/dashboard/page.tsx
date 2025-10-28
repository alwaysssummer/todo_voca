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
  Link as LinkIcon,
  Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AddStudentDialog } from '@/components/teacher/add-student-dialog'
import { AssignWordlistDialog } from '@/components/teacher/assign-wordlist-dialog'
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
  completedToday: number
  dailyGoal: number
  accessToken: string
}

interface Wordlist {
  id: number
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
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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
          // 오늘 완료한 단어 수
          const { count: todayCount } = await supabase
            .from('student_word_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('status', 'completed')
            .eq('completed_date', new Date().toISOString().split('T')[0])

          // 전체 진도 계산
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
            completedToday: todayCount || 0,
            dailyGoal: student.daily_goal,
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
            id: parseInt(wordlist.id),
            title: wordlist.name,
            totalWords: wordlist.total_words,
            assignedStudents: assignedCount || 0
          }
        })
      )

      setWordlists(wordlistsWithCount)

      // 통계 계산
      const activeCount = studentsWithProgress.filter(s => s.completedToday > 0).length
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

  const copyAccessLink = (token: string) => {
    const link = `${window.location.origin}/s/${token}/dashboard`
    navigator.clipboard.writeText(link)
    alert('접속 링크가 복사되었습니다!')
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  전체 학생
                </CardTitle>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                오늘 활동: {stats.activeStudents}명
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  단어장 수
                </CardTitle>
                <BookOpen className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalWordlists}</div>
              <p className="text-xs text-muted-foreground mt-1">
                등록된 단어장
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  평균 진도
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgProgress}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                전체 학생 평균
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  활동률
                </CardTitle>
                <Users className="w-4 h-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.totalStudents > 0 
                  ? Math.round((stats.activeStudents / stats.totalStudents) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                오늘 학습한 비율
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 단어장 목록 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>단어장 목록</CardTitle>
              <Button size="sm" className="gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wordlists.map((wordlist) => (
                  <Card key={wordlist.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-lg mb-2">{wordlist.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{wordlist.totalWords}개 단어</span>
                        <span>•</span>
                        <span>{wordlist.assignedStudents}명 배정</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-2">
                          <Eye className="w-3 h-3" />
                          보기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 학생 목록 */}
        <Card>
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
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{student.name}</h3>
                            <Badge variant={student.completedToday >= student.dailyGoal ? 'default' : 'secondary'}>
                              {student.completedToday}/{student.dailyGoal}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{student.email}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(student.progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{student.progress}%</span>
                          </div>
                        </div>
                        <div className="ml-4 flex gap-2">
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
                            onClick={() => copyAccessLink(student.accessToken)}
                            className="gap-2"
                          >
                            <LinkIcon className="w-3 h-3" />
                            링크
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => router.push(`/teacher/students/${student.id}`)}
                          >
                            <Eye className="w-3 h-3" />
                            상세
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
                    </CardContent>
                  </Card>
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
    </div>
  )
}

