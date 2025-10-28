'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck, Clock, AlertCircle, CheckCircle } from 'lucide-react'

interface TestStartScreenProps {
  completedCount: number
  dayNumber: number
  onStartTest: () => void
  onClose: () => void
}

export function TestStartScreen({
  completedCount,
  dayNumber,
  onStartTest,
  onClose
}: TestStartScreenProps) {
  const questionCount = Math.max(5, Math.floor(completedCount * 0.2))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <FileCheck className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">
            온라인 평가
          </CardTitle>
          <p className="text-gray-600">
            Day {dayNumber} · {completedCount}개 단어 완성
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 평가 정보 */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">문제 수</p>
                <p className="text-sm text-gray-600">
                  총 {questionCount}문제 (완성 단어의 20%)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">제한 시간</p>
                <p className="text-sm text-gray-600">5분</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">문제 유형</p>
                <p className="text-sm text-gray-600">
                  영어 단어를 보고 뜻(한글)을 주관식으로 입력
                </p>
              </div>
            </div>
          </div>

          {/* 평가 안내 */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">평가 안내</h3>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li>• 문제는 무작위로 출제됩니다</li>
              <li>• 이전/다음 버튼으로 자유롭게 이동 가능</li>
              <li>• 시간 종료 시 자동으로 제출됩니다</li>
              <li>• 제출 후에는 수정할 수 없습니다</li>
            </ul>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              나중에
            </Button>
            <Button
              onClick={onStartTest}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              평가 시작
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

