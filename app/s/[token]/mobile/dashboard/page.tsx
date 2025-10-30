import { MobileDashboard } from '@/components/student/mobile-dashboard'

interface PageProps {
  params: {
    token: string
  }
}

export default function MobileDashboardPage({ params }: PageProps) {
  return <MobileDashboard token={params.token} />
}

