'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

// 단어장별 회차 진행 정보
export interface WordlistProgress {
  id: string
  name: string
  currentSession: number
  totalSessions: number
}

export interface Student {
  id: string
  name: string
  email: string | null
  accessToken: string | null
  displayOrder: number
  lastActivityAt: string | null
  wordlists: WordlistProgress[]
}

interface StudentListPanelProps {
  students: Student[]
  selectedStudentId: string | null
  onSelectStudent: (studentId: string) => void
  onAddStudent: () => void
  onDeleteStudents: (studentIds: string[]) => void
  loading?: boolean
}

export function StudentListPanel({
  students,
  selectedStudentId,
  onSelectStudent,
  onAddStudent,
  onDeleteStudents,
  loading = false
}: StudentListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [sortField, setSortField] = useState<'name' | 'lastActivity'>('lastActivity')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // 정렬 함수
  const sortStudents = (studentsToSort: Student[]): Student[] => {
    return [...studentsToSort].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ko')
          break
        case 'lastActivity':
          const dateA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
          const dateB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
          comparison = dateA - dateB
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  // 필터링 + 정렬
  const filteredStudents = sortStudents(
    students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // 상대적 시간 표시
  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '어제'
    if (diffDays <= 3) return `${diffDays}일 전`
    if (diffDays <= 7) return '1주 전'
    return '1주+'
  }

  // 체크박스 토글
  const toggleStudentSelection = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  // 전체 선택
  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
  }

  // 정렬 토글
  const handleSortToggle = (field: 'name' | 'lastActivity') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 선택 삭제
  const handleDeleteSelected = () => {
    if (selectedStudents.length === 0) return
    onDeleteStudents(selectedStudents)
    setSelectedStudents([])
  }

  return (
    <div className="flex flex-col h-full border-r bg-white">
      {/* 검색 + 추가 */}
      <div className="p-3 border-b space-y-2">
        <Input
          placeholder="학생 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
              onCheckedChange={toggleSelectAll}
              className="h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">
              {selectedStudents.length > 0 ? `${selectedStudents.length}명` : '전체'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {selectedStudents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                삭제
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onAddStudent}
            >
              <Plus className="w-3 h-3 mr-1" />
              추가
            </Button>
          </div>
        </div>
      </div>

      {/* 정렬 헤더 */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30 text-xs">
        <button
          className="flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSortToggle('name')}
        >
          이름
          {sortField === 'name' ? (
            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          className="flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSortToggle('lastActivity')}
        >
          최근
          {sortField === 'lastActivity' ? (
            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* 학생 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchQuery ? '검색 결과가 없습니다' : '학생이 없습니다'}
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className={`flex items-center gap-2 px-2.5 py-2 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                selectedStudentId === student.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              }`}
              onClick={() => onSelectStudent(student.id)}
            >
              {/* 체크박스 */}
              <Checkbox
                checked={selectedStudents.includes(student.id)}
                onCheckedChange={() => {}}
                onClick={(e) => toggleStudentSelection(student.id, e)}
                className="h-4 w-4"
              />

              {/* 학생 이름 */}
              <span className="font-medium text-sm truncate flex-1">{student.name}</span>

              {/* 최근 활동 */}
              <span className={`text-xs shrink-0 ${
                formatRelativeTime(student.lastActivityAt) === '오늘' ? 'text-green-600 font-medium' :
                formatRelativeTime(student.lastActivityAt) === '-' ? 'text-muted-foreground' :
                'text-muted-foreground'
              }`}>
                {formatRelativeTime(student.lastActivityAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
