import { useState, useCallback, useRef } from 'react'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isLoadingRef = useRef(false)  // ⭐ ref로 로딩 상태 관리

  const speak = useCallback(async (text: string) => {
    // 이미 재생 중이면 중지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
    }

    // ⭐ ref로 중복 호출 방지 (첫 클릭 문제 해결)
    if (isLoadingRef.current) return

    try {
      isLoadingRef.current = true
      setIsLoading(true)

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const error = await response.json()
        // API 키 미설정 등 예상 가능한 에러는 warn 레벨로 처리
        const errorMsg = error.error || 'TTS request failed'
        console.warn('⚠️ [useTTS] TTS API 사용 불가:', errorMsg, `(status: ${response.status})`)
        throw new Error(errorMsg)
      }
      
      console.log('✅ [useTTS] TTS API 응답 성공')

      const { audioContent } = await response.json()
      
      // Base64를 오디오로 변환하여 재생
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`)
      audioRef.current = audio
      
      // ⭐ 명시적 로드
      audio.load()
      
      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => {
        setIsPlaying(false)
        audioRef.current = null
      }
      audio.onerror = () => {
        setIsPlaying(false)
        audioRef.current = null
      }
      
      await audio.play()
    } catch (error) {
      // TTS API 실패는 예상 가능한 상황이므로 warn 레벨로 처리 (폴백이 정상 동작함)
      console.warn('⚠️ [useTTS] TTS API 실패 → 브라우저 기본 TTS로 폴백')
      fallbackSpeak(text)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [])  // ⭐ 의존성 배열 비움

  // 브라우저 기본 TTS 폴백 (개선 버전)
  const fallbackSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      
      // ⭐ 영어 원어민 음성 선택 (모바일 개선)
      const voices = speechSynthesis.getVoices()
      const enVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('US') || v.name.includes('United States') || v.name.includes('American')) &&
        !v.name.includes('한국') && 
        !v.name.includes('Korean')
      ) || voices.find(v => v.lang === 'en-US')
      
      if (enVoice) {
        utterance.voice = enVoice
        console.log('🔊 [Fallback] 선택된 음성:', enVoice.name)
      } else {
        console.warn('⚠️ [Fallback] 영어 음성을 찾을 수 없음, 기본 음성 사용')
      }
      
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      speechSynthesis.speak(utterance)
    }
  }

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    speechSynthesis.cancel()
    setIsPlaying(false)
  }, [])

  return { speak, stop, isPlaying, isLoading }
}

