'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  BookOpen,
  Users,
  Plus,
  Eye,
  Trash2,
  Edit2,
  Check,
  X,
  Merge,
  GripVertical,
  Printer,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface Wordlist {
  id: string
  title: string
  totalWords: number
  assignedStudents: number
  displayOrder: number
}

interface WordlistManagementTabProps {
  wordlists: Wordlist[]
  onWordlistsChange: (wordlists: Wordlist[]) => void
  onAddWordlist: () => void
  onViewWordlist: (wordlist: Wordlist) => void
  onPrintWordlist: (wordlistId: string, title: string) => void
  onDeleteWordlist: (wordlistId: string, title: string) => void
  onMergeWordlists: (wordlistIds: string[]) => void
  onRefresh: () => void
}

// Sortable Item
function SortableWordlistItem({ wordlist, children }: { wordlist: Wordlist; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: wordlist.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-accent rounded"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      {children}
    </div>
  )
}

export function WordlistManagementTab({
  wordlists,
  onWordlistsChange,
  onAddWordlist,
  onViewWordlist,
  onPrintWordlist,
  onDeleteWordlist,
  onMergeWordlists,
  onRefresh
}: WordlistManagementTabProps) {
  const [selectedWordlists, setSelectedWordlists] = useState<string[]>([])
  const [editingWordlistId, setEditingWordlistId] = useState<string | null>(null)
  const [editingWordlistName, setEditingWordlistName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 체크박스 토글
  const toggleWordlistSelection = (wordlistId: string) => {
    setSelectedWordlists(prev =>
      prev.includes(wordlistId)
        ? prev.filter(id => id !== wordlistId)
        : [...prev, wordlistId]
    )
  }

  // 전체 선택
  const toggleSelectAll = () => {
    if (selectedWordlists.length === wordlists.length) {
      setSelectedWordlists([])
    } else {
      setSelectedWordlists(wordlists.map(w => w.id))
    }
  }

  // 이름 편집
  const handleEditWordlistName = (wordlistId: string, currentName: string) => {
    setEditingWordlistId(wordlistId)
    setEditingWordlistName(currentName)
  }

  const handleSaveWordlistName = async () => {
    if (!editingWordlistId || !editingWordlistName.trim()) return

    try {
      const { error } = await (supabase as any)
        .from('wordlists')
        .update({ name: editingWordlistName.trim() })
        .eq('id', editingWordlistId)

      if (error) throw error

      onWordlistsChange(wordlists.map(w =>
        w.id === editingWordlistId ? { ...w, title: editingWordlistName.trim() } : w
      ))

      setEditingWordlistId(null)
      setEditingWordlistName('')
    } catch (err: any) {
      console.error('단어장 이름 변경 실패:', err)
      alert(err.message || '단어장 이름 변경 중 오류가 발생했습니다.')
    }
  }

  const handleCancelEdit = () => {
    setEditingWordlistId(null)
    setEditingWordlistName('')
  }

  // 선택 삭제
  const handleDeleteSelected = async () => {
    if (selectedWordlists.length === 0) return

    const selectedItems = wordlists.filter(w => selectedWordlists.includes(w.id))
    const assignedCount = selectedItems.filter(w => w.assignedStudents > 0).length
    const totalAssignedStudents = selectedItems.reduce((sum, w) => sum + w.assignedStudents, 0)

    let confirmMessage = `선택한 ${selectedWordlists.length}개의 단어장을 삭제하시겠습니까?\n\n`

    if (assignedCount > 0) {
      confirmMessage += `⚠️ 경고: ${assignedCount}개의 단어장이 총 ${totalAssignedStudents}명의 학생에게 배정되어 있습니다.\n`
      confirmMessage += `관련된 모든 학습 데이터가 삭제됩니다.`
    }

    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('wordlists')
        .delete()
        .in('id', selectedWordlists)

      if (error) throw error

      alert(`${selectedWordlists.length}개의 단어장이 삭제되었습니다.`)
      setSelectedWordlists([])
      onRefresh()
    } catch (err: any) {
      console.error('단어장 일괄 삭제 실패:', err)
      alert(err.message || '단어장 삭제 중 오류가 발생했습니다.')
    }
  }

  // 드래그 앤 드롭
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = wordlists.findIndex((w) => w.id === active.id)
    const newIndex = wordlists.findIndex((w) => w.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newWordlists = arrayMove(wordlists, oldIndex, newIndex)
    onWordlistsChange(newWordlists)

    try {
      const updates = newWordlists.map((wordlist, index) => ({
        id: wordlist.id,
        display_order: index
      }))

      for (const update of updates) {
        await (supabase as any)
          .from('wordlists')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }
    } catch (error) {
      console.error('단어장 순서 저장 실패:', error)
      onRefresh()
    }
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>단어장 목록</CardTitle>
            <Button size="sm" className="gap-2" onClick={onAddWordlist}>
              <Plus className="w-4 h-4" />
              단어장 추가
            </Button>
          </div>

          {wordlists.length > 0 && (
            <div className="flex items-center justify-between gap-2 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedWordlists.length === wordlists.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  전체 선택
                  {selectedWordlists.length > 0 && (
                    <span className="ml-1 text-blue-600 font-semibold">
                      ({selectedWordlists.length}/{wordlists.length})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={selectedWordlists.length < 2}
                  onClick={() => onMergeWordlists(selectedWordlists)}
                >
                  <Merge className="w-4 h-4" />
                  통합하기
                  {selectedWordlists.length >= 2 && (
                    <Badge variant="secondary" className="ml-1">{selectedWordlists.length}</Badge>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={selectedWordlists.length === 0}
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="w-4 h-4" />
                  선택 삭제
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {wordlists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 단어장이 없습니다
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={wordlists.map(w => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {wordlists.map((wordlist) => (
                    <SortableWordlistItem key={wordlist.id} wordlist={wordlist}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors flex-1">
                        <div className="flex items-center gap-4 flex-1">
                          <Checkbox
                            checked={selectedWordlists.includes(wordlist.id)}
                            onCheckedChange={() => toggleWordlistSelection(wordlist.id)}
                          />

                          {editingWordlistId === wordlist.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingWordlistName}
                                onChange={(e) => setEditingWordlistName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveWordlistName()
                                  else if (e.key === 'Escape') handleCancelEdit()
                                }}
                                className="h-8 w-64"
                                autoFocus
                                onBlur={handleSaveWordlistName}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600"
                                onClick={handleSaveWordlistName}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <h3 className="font-semibold">{wordlist.title}</h3>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => handleEditWordlistName(wordlist.id, wordlist.title)}
                              >
                                <Edit2 className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {wordlist.totalWords}개
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {wordlist.assignedStudents}명
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => onViewWordlist(wordlist)}
                          >
                            <Eye className="w-3 h-3" />
                            보기
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => onPrintWordlist(wordlist.id, wordlist.title)}
                          >
                            <Printer className="w-3 h-3" />
                            인쇄
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteWordlist(wordlist.id, wordlist.title)}
                            className={`gap-2 ${
                              wordlist.assignedStudents > 0
                                ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </SortableWordlistItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
