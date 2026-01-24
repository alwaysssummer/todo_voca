import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// 한국 시간(KST) 유틸리티 함수
// ============================================

/**
 * 한국 시간 기준 오늘 날짜 (YYYY-MM-DD)
 * UTC 기준 new Date().toISOString().split('T')[0] 대신 사용
 */
export function getKoreanToday(): string {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '-').replace('.', '')
}

/**
 * 한국 시간 기준 현재 시각의 Date 객체
 * 주의: 반환된 Date 객체는 로컬 타임존이지만, 값은 KST 기준
 */
export function getKoreanNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
}

/**
 * 날짜를 한국 시간 기준 YYYY-MM-DD 문자열로 변환
 */
export function toKoreanDateString(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '-').replace('.', '')
}

