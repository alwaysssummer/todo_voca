import { MobileDashboard } from '@/components/student/mobile-dashboard'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function MobileDashboardPage({ params }: PageProps) {
  const { token } = await params
  return <MobileDashboard token={token} />
}

