import { MobileDashboard } from '@/components/student/mobile-dashboard'

interface PageProps {
  params: Promise<{
    token: string
  }>
  searchParams: Promise<{
    assignment?: string
  }>
}

export default async function MobileDashboardPage({ params, searchParams }: PageProps) {
  const { token } = await params
  const { assignment } = await searchParams
  return <MobileDashboard token={token} initialAssignmentId={assignment} />
}

