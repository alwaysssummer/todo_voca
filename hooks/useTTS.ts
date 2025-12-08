import { useState, useCallback, useRef } from 'react'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speak = useCallback(async (text: string) => {
    // 이미 재생 중이면 중지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
    }

    if (isLoading) return

    try {
      setIsLoading(true)

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'TTS request failed')
      }

      const { audioContent } = await response.json()
      
      // Base64를 오디오로 변환하여 재생
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`)
      audioRef.current = audio
      
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
      console.error('TTS Error:', error)
      // 에러 시 브라우저 기본 TTS로 폴백
      fallbackSpeak(text)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  // 브라우저 기본 TTS 폴백
  const fallbackSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
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

