import { useState, useCallback, useRef, useEffect } from 'react'

// ⭐ TTS 캐시 (모듈 레벨 - 컴포넌트 간 공유)
const audioCache = new Map<string, string>() // Blob URL 캐시
const CACHE_MAX_SIZE = 50

// 오디오 unlock 상태 (모듈 레벨)
let isAudioUnlocked = false

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isLoadingRef = useRef(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const prefetchingRef = useRef<Set<string>>(new Set())

  // 음성 목록 사전 로드 (폴백용)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        voicesRef.current = voices
        console.log('🎤 [TTS] 음성 목록 로드됨:', voices.length, '개')
      }
    }

    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    const retryTimer = setTimeout(loadVoices, 1000)

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      clearTimeout(retryTimer)
    }
  }, [])

  // ⭐ 오디오 unlock (사용자 제스처 내에서 호출)
  const unlockAudio = useCallback(() => {
    if (isAudioUnlocked) return

    const audio = new Audio()
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
    audio.volume = 0.01
    audio.play().then(() => {
      audio.pause()
      console.log('🔓 [TTS] Audio unlock 완료')
    }).catch(() => {})

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('')
      utterance.volume = 0
      speechSynthesis.speak(utterance)
      speechSynthesis.cancel()
    }

    isAudioUnlocked = true
  }, [])

  // ⭐ TTS 데이터 가져오기 (Blob URL 반환)
  const fetchTTSData = useCallback(async (text: string): Promise<string> => {
    if (audioCache.has(text)) {
      console.log('🔮 [TTS] 캐시에서 로드:', text)
      return audioCache.get(text)!
    }

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

    const binaryString = atob(audioContent)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'audio/mp3' })
    const blobUrl = URL.createObjectURL(blob)

    if (audioCache.size >= CACHE_MAX_SIZE) {
      const firstKey = audioCache.keys().next().value
      if (firstKey) {
        URL.revokeObjectURL(audioCache.get(firstKey)!)
        audioCache.delete(firstKey)
      }
    }
    audioCache.set(text, blobUrl)
    console.log('💾 [TTS] 캐시에 저장:', text)

    return blobUrl
  }, [])

  // 프리페칭
  const prefetchTTS = useCallback(async (text: string) => {
    if (audioCache.has(text) || prefetchingRef.current.has(text)) return

    prefetchingRef.current.add(text)
    try {
      await fetchTTSData(text)
    } catch (error) {
      console.warn('🔮 [TTS] 프리페칭 실패:', text)
    } finally {
      prefetchingRef.current.delete(text)
    }
  }, [fetchTTSData])

  // 브라우저 TTS 폴백
  const fallbackSpeak = useCallback((text: string): boolean => {
    if (!('speechSynthesis' in window)) return false

    try {
      speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      utterance.volume = 1

      const voices = voicesRef.current.length > 0 ? voicesRef.current : speechSynthesis.getVoices()
      const enVoice = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('US'))
      ) || voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'))

      if (enVoice) utterance.voice = enVoice

      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)

      speechSynthesis.speak(utterance)
      console.log('🔊 [TTS] 브라우저 TTS 요청:', text)
      return true
    } catch (error) {
      console.error('❌ [TTS] 브라우저 TTS 실패:', error)
      return false
    }
  }, [])

  // ⭐ 메인 speak 함수
  const speak = useCallback(async (text: string) => {
    // 이전 재생 중지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    setIsPlaying(false)

    if (isLoadingRef.current) return

    // 오디오 unlock
    unlockAudio()

    // 캐시된 경우 즉시 재생
    if (audioCache.has(text)) {
      const blobUrl = audioCache.get(text)!
      const audio = new Audio(blobUrl)
      audioRef.current = audio

      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => { setIsPlaying(false); audioRef.current = null }
      audio.onerror = () => { setIsPlaying(false); fallbackSpeak(text) }

      try {
        await audio.play()
        return
      } catch {
        fallbackSpeak(text)
        return
      }
    }

    // 안드로이드: 브라우저 TTS 우선
    const isAndroid = /Android/i.test(navigator.userAgent)
    if (isAndroid) {
      console.log('📱 [TTS] 안드로이드 - 브라우저 TTS 우선')
      const success = fallbackSpeak(text)
      fetchTTSData(text).catch(() => {}) // 백그라운드 캐싱
      if (success) return
    }

    // API 호출 후 재생
    try {
      isLoadingRef.current = true
      setIsLoading(true)

      const blobUrl = await fetchTTSData(text)
      const audio = new Audio(blobUrl)
      audioRef.current = audio

      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => { setIsPlaying(false); audioRef.current = null }
      audio.onerror = () => setIsPlaying(false)

      await audio.play()
      console.log('🔊 [TTS] Google TTS 재생:', text)
    } catch (error: any) {
      console.warn('⚠️ [TTS] Google TTS 실패:', error.message)
      fallbackSpeak(text)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [unlockAudio, fetchTTSData, fallbackSpeak])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    setIsPlaying(false)
  }, [])

  return { speak, stop, prefetchTTS, isPlaying, isLoading }
}

