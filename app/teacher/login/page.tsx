'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // 개인용: 로그인 페이지 접속 시 바로 대시보드로 이동
    router.push('/teacher/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <p className="text-muted-foreground">대시보드로 이동 중...</p>
    </div>
  )
}

