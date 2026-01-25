'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, CheckCircle, BookOpen, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Student {
  id: string
  name: string
  lastActivityAt: string | null
}

interface StudentStats {
  id: string
  name: string
  todayWords: number
  weeklyWords: number
  accuracy: number | null
  lastActivityAt: string | null
}

interface OverviewDashboardProps {
  students: Student[]
  onSelectStudent: (studentId: string) => void
}

export function OverviewDashboard({ students, onSelectStudent }: OverviewDashboardProps) {
  const [studentStats, setStudentStats] = useState<StudentStats[]>([])
  const [weeklyData, setWeeklyData] = useState<{ label: string; date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  // 통계 계산
  const totalStudents = students.length
  const todayStudents = studentStats.filter(s => s.todayWords > 0).length
  const weeklyTotal = studentStats.reduce((sum, s) => sum + s.weeklyWords, 0)
  const studentsWithAccuracy = studentStats.filter(s => s.accuracy !== null)
  const avgAccuracy = studentsWithAccuracy.length > 0
    ? Math.round(studentsWithAccuracy.reduce((sum, s) => sum + (s.accuracy || 0), 0) / studentsWithAccuracy.length)
    : null

  // 날짜 유틸
  const getToday = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  const getWeekStart = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // 월요일 시작
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday.toISOString()
  }

  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
    return `${Math.floor(diffDays / 30)}개월 전`
  }

  const getStatusColor = (lastActivityAt: string | null) => {
    if (!lastActivityAt) return 'bg-gray-300'
    const date = new Date(lastActivityAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'bg-green-500'
    if (diffDays <= 3) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // 데이터 로드
  const loadStats = useCallback(async () => {
    if (students.length === 0) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const today = getToday()
      const weekStart = getWeekStart()
      const studentIds = students.map(s => s.id)

      // 각 학생별 통계 계산
      const statsPromises = students.map(async (student) => {
        // 오늘 학습량
        const { data: todayData } = await supabase
          .from('completed_wordlists')
          .select('word_count')
          .eq('student_id', student.id)
          .gte('completed_date', today)

        const todayWords = (todayData || []).reduce((sum, d) => sum + (d.word_count || 0), 0)

        // 이번 주 학습량
        const { data: weeklyData } = await supabase
          .from('completed_wordlists')
          .select('word_count')
          .eq('student_id', student.id)
          .gte('created_at', weekStart)

        const weeklyWords = (weeklyData || []).reduce((sum, d) => sum + (d.word_count || 0), 0)

        // 정답률
        const { data: testData } = await supabase
          .from('online_tests')
          .select('correct_count, total_count')
          .eq('student_id', student.id)

        let accuracy: number | null = null
        if (testData && testData.length > 0) {
          const totalCorrect = testData.reduce((sum, t) => sum + (t.correct_count || 0), 0)
          const totalCount = testData.reduce((sum, t) => sum + (t.total_count || 0), 0)
          if (totalCount > 0) {
            accuracy = Math.round((totalCorrect / totalCount) * 100)
          }
        }

        return {
          id: student.id,
          name: student.name,
          todayWords,
          weeklyWords,
          accuracy,
          lastActivityAt: student.lastActivityAt
        }
      })

      const stats = await Promise.all(statsPromises)
      // 오늘 학습 > 이번주 학습 > 이름 순으로 정렬
      stats.sort((a, b) => {
        if (b.todayWords !== a.todayWords) return b.todayWords - a.todayWords
        if (b.weeklyWords !== a.weeklyWords) return b.weeklyWords - a.weeklyWords
        return a.name.localeCompare(b.name)
      })
      setStudentStats(stats)

      // 주간 차트 데이터 (최근 7일)
      const days = ['일', '월', '화', '수', '목', '금', '토']
      const weeklyChartData: { label: string; date: string; count: number }[] = []

      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const dayLabel = days[date.getDay()]

        const { data: dayData } = await supabase
          .from('completed_wordlists')
          .select('word_count')
          .in('student_id', studentIds)
          .eq('completed_date', dateStr)

        const count = (dayData || []).reduce((sum, d) => sum + (d.word_count || 0), 0)
        weeklyChartData.push({ label: dayLabel, date: dateStr, count })
      }

      setWeeklyData(weeklyChartData)
    } catch (err) {
      console.error('통계 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [students])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count), 1)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 헤더 */}
        <h2 className="text-xl font-bold text-gray-800">전체 현황</h2>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}명</p>
                <p className="text-sm text-gray-500">전체 학생</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{todayStudents}명</p>
                <p className="text-sm text-gray-500">오늘 학습</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{weeklyTotal}</p>
                <p className="text-sm text-gray-500">주간 학습</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {avgAccuracy !== null ? `${avgAccuracy}%` : '-'}
                </p>
                <p className="text-sm text-gray-500">평균 정답률</p>
              </div>
            </div>
          </div>
        </div>

        {/* 주간 학습 차트 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-4">주간 학습 현황 (최근 7일)</h3>
          <div className="flex items-end gap-2 h-32">
            {weeklyData.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{day.count > 0 ? day.count : ''}</span>
                <div
                  className="w-full bg-purple-500 rounded-t transition-all"
                  style={{
                    height: `${(day.count / maxWeeklyCount) * 100}%`,
                    minHeight: day.count > 0 ? '4px' : '0px'
                  }}
                />
                <span className="text-xs text-gray-600 font-medium">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 학생별 학습 현황 테이블 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-700">학생별 학습 현황</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">이름</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">오늘</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">이번주</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">정답률</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.map((student) => (
                  <tr
                    key={student.id}
                    className="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSelectStudent(student.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 hover:text-purple-600">
                        {student.name}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={student.todayWords > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {student.todayWords}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={student.weeklyWords > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                        {student.weeklyWords}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={student.accuracy !== null ? 'text-gray-700' : 'text-gray-400'}>
                        {student.accuracy !== null ? `${student.accuracy}%` : '-'}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(student.lastActivityAt)}`} />
                        <span className="text-xs text-gray-500">
                          {getRelativeTime(student.lastActivityAt) || '없음'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {studentStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      등록된 학생이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
