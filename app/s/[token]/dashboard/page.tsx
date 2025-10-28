import { StudentDashboard } from '@/components/student/dashboard'

interface DashboardPageProps {
  params: Promise<{
    token: string
  }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { token } = await params
  return <StudentDashboard token={token} />
}

