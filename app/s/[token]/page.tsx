import { redirect } from 'next/navigation'
import { StudyScreen } from '@/components/student/study-screen'

interface StudentPageProps {
  params: {
    token: string
  }
}

export default async function StudentPage({ params }: StudentPageProps) {
  const { token } = await params

  // 토큰 유효성 검증은 StudyScreen 컴포넌트에서 처리
  return <StudyScreen token={token} />
}

