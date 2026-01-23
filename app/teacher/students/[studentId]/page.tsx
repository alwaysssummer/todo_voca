import { StudentDetailView } from '@/components/teacher/student-detail-view'

interface StudentDetailPageProps {
  params: Promise<{ studentId: string }>
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { studentId } = await params
  return <StudentDetailView studentId={studentId} />
}
