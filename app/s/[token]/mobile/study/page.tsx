import { StudyScreen } from '@/components/student/study-screen'

interface MobileStudyPageProps {
  params: Promise<{
    token: string
  }>
  searchParams: Promise<{
    assignment?: string
  }>
}

export default async function MobileStudyPage({ params, searchParams }: MobileStudyPageProps) {
  const { token } = await params
  const { assignment: assignmentId } = await searchParams

  return <StudyScreen token={token} assignmentId={assignmentId} />
}
