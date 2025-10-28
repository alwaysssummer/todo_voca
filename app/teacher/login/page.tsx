'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BookOpen, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function TeacherLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 이메일 형식으로 변환 (teacher -> teacher@todovoca.com)
      const emailToSearch = email.includes('@') ? email : `${email}@todovoca.com`
      
      // Supabase에서 강사 확인
      const { data: teacher, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailToSearch)
        .eq('role', 'teacher')
        .single()

      if (dbError || !teacher) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다')
        setLoading(false)
        return
      }

      // 비밀번호 확인 (평문 비교 - 실제 운영에서는 bcrypt 사용)
      if (teacher.password_hash !== password) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다')
        setLoading(false)
        return
      }

      // 로그인 성공 - 세션 저장
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Todo Voca
          </h1>
          <p className="text-muted-foreground">강사 로그인</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">아이디</Label>
            <Input
              id="email"
              type="text"
              placeholder="teacher"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            💡 테스트: teacher / 7136
          </p>
        </div>
      </Card>
    </div>
  )
}

