import { useState, useCallback, useRef, useEffect } from 'react'

// Base64 → ArrayBuffer 변환
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const isLoadingRef = useRef(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  // AudioContext 초기화 (싱글톤)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // 음성 목록 사전 로드 (폴백용)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        voicesRef.current = voices
      }
    }

    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const speak = useCallback(async (text: string) => {
    // 이미 재생 중이면 중지
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
      } catch (e) { /* 이미 중지됨 */ }
      sourceNodeRef.current = null
      setIsPlaying(false)
    }

    if (isLoadingRef.current) return

    try {
      isLoadingRef.current = true
      setIsLoading(true)

      // 1. AudioContext 가져오기 & resume (사용자 상호작용 시점에 호출됨)
      const audioContext = getAudioContext()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
        console.log('🔓 [TTS] AudioContext resumed')
      }

      // 2. TTS API 호출
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
      console.log('✅ [TTS] Google TTS API 응답 성공')

      // 3. Base64 → ArrayBuffer → AudioBuffer
      const arrayBuffer = base64ToArrayBuffer(audioContent)
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // 4. AudioBufferSourceNode로 재생
      const sourceNode = audioContext.createBufferSource()
      sourceNode.buffer = audioBuffer
      sourceNode.connect(audioContext.destination)

      sourceNode.onended = () => {
        setIsPlaying(false)
        sourceNodeRef.current = null
      }

      sourceNodeRef.current = sourceNode
      setIsPlaying(true)
      sourceNode.start(0)

      console.log('🔊 [TTS] Google TTS 재생 시작')
    } catch (error: any) {
      console.warn('⚠️ [TTS] Google TTS 실패:', error.message, '→ 브라우저 TTS로 폴백')
      fallbackSpeak(text)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [getAudioContext])

  // 브라우저 기본 TTS 폴백
  const fallbackSpeak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return

    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9

    const voices = voicesRef.current.length > 0 ? voicesRef.current : speechSynthesis.getVoices()
    const enVoice = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('US') || v.name.includes('United States') || v.name.includes('American'))
    ) || voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'))

    if (enVoice) utterance.voice = enVoice

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    setTimeout(() => speechSynthesis.speak(utterance), 50)
  }, [])

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
      } catch (e) { /* 이미 중지됨 */ }
      sourceNodeRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    setIsPlaying(false)
  }, [])

  return { speak, stop, isPlaying, isLoading }
}

