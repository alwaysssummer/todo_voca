'use client'

import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface TestQuestionScreenProps {
  word: string
  options: string[]  // 👈 추가: 4개 선택지
  currentIndex: number
  totalQuestions: number
  currentAnswer: string
  canGoPrevious: boolean
  canGoNext: boolean
  isSubmitting: boolean
  answeredCount: number
  onAnswerChange: (value: string) => void
  onPrevious: () => void
  onNext: () => void
  onSubmit: () => void
}

export function TestQuestionScreen({
  word,
  options,  // 👈 추가
  currentIndex,
  totalQuestions,
  currentAnswer,
  canGoPrevious,
  canGoNext,
  isSubmitting,
  answeredCount,
  onAnswerChange,
  onPrevious,
  onNext,
  onSubmit
}: TestQuestionScreenProps) {

  const progress = ((currentIndex + 1) / totalQuestions) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex flex-col p-4">
      {/* 헤더 - 타이머 제거 */}
      <div className="w-full max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-gray-700">
            문제 {currentIndex + 1} / {totalQuestions}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 메인 카드 */}
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-8 space-y-8">
            {/* 단어 표시 */}
            <div className="text-center">
              <div className="py-8 px-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 break-words">
                  {word}
                </h1>
              </div>
            </div>

            {/* 객관식 선택지 (컴팩트 2열) */}
            <RadioGroup 
              value={currentAnswer} 
              onValueChange={onAnswerChange}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {options.map((option, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex items-center space-x-2.5 p-3.5 border-2 rounded-xl cursor-pointer transition-all",
                    currentAnswer === option 
                      ? "border-blue-500 bg-blue-50 shadow-sm" 
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  )}
                  onClick={() => onAnswerChange(option)}
                >
                  <RadioGroupItem 
                    value={option} 
                    id={`option-${idx}`}
                    className="shrink-0"
                  />
                  <Label 
                    htmlFor={`option-${idx}`} 
                    className="flex-1 cursor-pointer leading-tight"
                  >
                    <span className="font-semibold text-blue-600 mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span className="text-sm">
                      {option}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

