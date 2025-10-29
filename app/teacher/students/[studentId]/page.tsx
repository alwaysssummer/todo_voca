'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  Link as LinkIcon,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface StudentDetail {
  id: string
  name: string
  dailyGoal: number
  accessToken: string
  createdAt: string
}

interface StudentStats {
  totalCompleted: number
  totalWords: number
  progress: number
  completedToday: number
  completedWordlists: number
  avgTestScore: number
}

interface CompletedWordlist {
  id: string
  day_number: number
  word_ids: string[]
  completed_date: string
}

interface RecentTest {
  id: string
  score: number
  grade: string
  createdAt: string
  wordlistId: string
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [stats, setStats] = useState<StudentStats>({
    totalCompleted: 0,
    totalWords: 0,
    progress: 0,
    completedToday: 0,
    completedWordlists: 0,
    avgTestScore: 0
  })
  const [completedWordlists, setCompletedWordlists] = useState<CompletedWordlist[]>([])
  const [recentTests, setRecentTests] = useState<RecentTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 로그인 확인
    const teacherId = sessionStorage.getItem('teacher_id')
    if (!teacherId) {
      router.push('/teacher/login')
      return
    }

    loadStudentData()
  }, [studentId, router])

  const loadStudentData = async () => {
    try {
      // 학생 기본 정보
      const { data: studentData, error: studentError } = await supabase
        .from('users')
        .select('id, name, daily_goal, access_token, created_at')
        .eq('id', studentId)
        .eq('role', 'student')
        .single()

      if (studentError) throw studentError

      setStudent({
        id: studentData.id,
        name: studentData.name,
        dailyGoal: studentData.daily_goal,
        accessToken: studentData.access_token,
        createdAt: studentData.created_at
      })

      // 통계 계산
      const { count: totalCompleted } = await supabase
        .from('student_word_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'completed')

      const { count: totalWords } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })

      const { count: completedToday } = await supabase
        .from('student_word_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .eq('completed_date', new Date().toISOString().split('T')[0])

      const { count: completedWordlistsCount } = await supabase
        .from('completed_wordlists')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)

      const progress = totalWords ? Math.round(((totalCompleted || 0) / totalWords) * 100) : 0

      // 평균 시험 점수
      const { data: testsData } = await supabase
        .from('online_tests')
        .select('score')
        .eq('student_id', studentId)

      const avgScore = testsData && testsData.length > 0
        ? Math.round(testsData.reduce((sum, t) => sum + t.score, 0) / testsData.length)
        : 0

      setStats({
        totalCompleted: totalCompleted || 0,
        totalWords: totalWords || 0,
        progress,
        completedToday: completedToday || 0,
        completedWordlists: completedWordlistsCount || 0,
        avgTestScore: avgScore
      })

      // 완성 단어장 목록
      const { data: wordlistsData } = await supabase
        .from('completed_wordlists')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10)

      setCompletedWordlists(wordlistsData || [])

      // 최근 시험 기록
      const { data: testsDataRecent } = await supabase
        .from('online_tests')
        .select('id, score, grade, created_at, completed_wordlist_id')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5)

      const formattedTests = (testsDataRecent || []).map(test => ({
        id: test.id,
        score: test.score,
        grade: test.grade,
        createdAt: test.created_at,
        wordlistId: test.completed_wordlist_id
      }))
      setRecentTests(formattedTests)

      setLoading(false)
    } catch (err) {
      console.error('학생 데이터 로드 실패:', err)
      setLoading(false)
    }
  }

  const copyAccessLink = () => {
    if (student) {
      const link = `${window.location.origin}/s/${student.accessToken}/dashboard`
      navigator.clipboard.writeText(link)
      alert('접속 링크가 복사되었습니다!')
    }
  }

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

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">학생을 찾을 수 없습니다</p>
          <Button onClick={() => router.push('/teacher/dashboard')} className="mt-4">
            대시보드로 돌아가기
          </Button>
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/teacher/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                대시보드
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{student.name}</h1>
                <p className="text-sm text-muted-foreground">
                  가입일: {new Date(student.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
            <Button onClick={copyAccessLink} className="gap-2">
              <LinkIcon className="w-4 h-4" />
              접속 링크 복사
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  전체 진도
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.progress}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalCompleted}/{stats.totalWords} 단어
              </p>
              <Progress value={stats.progress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  오늘 학습
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {student.dailyGoal}개
              </p>
              <Progress 
                value={Math.min((stats.completedToday / student.dailyGoal) * 100, 100)} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  완성 단어장
                </CardTitle>
                <Award className="w-4 h-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedWordlists}</div>
              <p className="text-xs text-muted-foreground mt-1">
                완료한 Day 수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  평균 시험 점수
                </CardTitle>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgTestScore}점</div>
              <p className="text-xs text-muted-foreground mt-1">
                전체 시험 평균
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 완성 단어장 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                완성 단어장 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedWordlists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  완성한 단어장이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {completedWordlists.map((wordlist) => (
                    <Card key={wordlist.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge>Day {wordlist.day_number}</Badge>
                              <span className="text-sm font-medium">
                                {wordlist.word_ids?.length || 0}개 완료
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(wordlist.completed_date).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 최근 시험 기록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                최근 시험 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  시험 기록이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTests.map((test) => (
                    <Card key={test.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={test.grade === 'A' ? 'default' : 'secondary'}>
                                {test.grade}
                              </Badge>
                              <span className="text-lg font-bold">{test.score}점</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(test.createdAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          {test.score >= 80 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

