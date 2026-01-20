'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/database'

export default function HomePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 비밀번호로 강사 찾기
      const { data: teacher, error: dbError } = await supabase
        .from('users')
        .select('id, name')
        .eq('password_hash', password)
        .eq('role', 'teacher')
        .single<Pick<User, 'id' | 'name'>>()

      if (dbError || !teacher) {
        setError('비밀번호가 올바르지 않습니다')
        setLoading(false)
        return
      }

      // 로그인 성공 - 세션 저장
      console.log('✅ [Login] 로그인 성공:', { teacherId: teacher.id, teacherName: teacher.name })
      
      // 자동 로그인: localStorage에 저장 (30일 유지)
      const loginTime = Date.now().toString()
      localStorage.setItem('teacher_id', teacher.id)
      localStorage.setItem('teacher_name', teacher.name)
      localStorage.setItem('teacher_login_time', loginTime)
      
      // sessionStorage는 항상 저장 (현재 세션용)
      sessionStorage.setItem('teacher_id', teacher.id)
      sessionStorage.setItem('teacher_name', teacher.name)
      
      router.push('/teacher/dashboard')
    } catch (err) {
      console.error('로그인 오류:', err)
      setError('로그인 중 오류가 발생했습니다')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8 max-w-md w-full">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900">Todo Voca</h1>
          <p className="text-2xl text-gray-600">체크리스트 단어장</p>
          <p className="text-lg text-gray-500">
            단어 암기를 체크리스트처럼 하나씩 완료하세요
          </p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            placeholder="강사 비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="text-center text-lg h-14"
          />
          <Button 
            type="submit"
            className="w-full h-14 bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="pt-8">
          <p className="text-sm text-gray-500">
            학생은 강사가 제공한 링크로 접속하세요
          </p>
        </div>
      </div>
    </div>
  );
}

