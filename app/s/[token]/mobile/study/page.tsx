import { StudyScreen } from '@/components/student/study-screen'

interface MobileStudyPageProps {
  params: Promise<{
    token: string
  }>
}

export default async function MobileStudyPage({ params }: MobileStudyPageProps) {
  const { token } = await params
  return <StudyScreen token={token} />
}

