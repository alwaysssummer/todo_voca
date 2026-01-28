import { useState, useCallback, useRef, useEffect } from 'react'

// ⭐ TTS 캐시 (모듈 레벨 - 컴포넌트 간 공유)
const audioCache = new Map<string, string>() // Blob URL 캐시
const CACHE_MAX_SIZE = 50

// 안드로이드 감지
const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

// ⭐ 전역 Audio 요소 (재사용하면 더 안정적)
let globalAudio: HTMLAudioElement | null = null

// ⭐ Audio unlock 상태 추적
let audioUnlocked = false

// ⭐ 전역 오디오 unlock 함수 (더 강력한 버전)
export function unlockAudioGlobal() {
  console.log('🔓 [TTS] 오디오 시스템 unlock 시도...', isAndroid ? '(안드로이드)' : '')

  // 1. HTML5 Audio unlock - 전역 Audio 생성 및 활성화
  try {
    if (!globalAudio) {
      globalAudio = new Audio()
      globalAudio.preload = 'auto'
    }

    // ⭐ 안드로이드: 사일런트 오디오로 unlock (더 긴 오디오)
    globalAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleKS84cF9Zi9FhrPCx3VzP8fT8+rIo4tthnd1fH9+emh7oO26fhyC7/z/3sCdfXiZvIdjDXn2////0amRb4SsulkcG7j/Dve1jY2VmqynooNxf8Pg5rOWfWx7jKGmpJeEABiNqLu2oI11bHuFfnVqcZO6waSBWVVod4KIhn5zbHGBmpyTgXJoZ2pxd3h3cG9wd4SQko+EenZzcnJxcXJzdHV2d3l5enp7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7'
    globalAudio.volume = 0.01
    globalAudio.muted = false

    const playPromise = globalAudio.play()
    if (playPromise) {
      playPromise.then(() => {
        globalAudio?.pause()
        if (globalAudio) {
          globalAudio.volume = 1
          globalAudio.currentTime = 0
        }
        audioUnlocked = true
        console.log('🔓 [TTS] HTML5 Audio unlock 성공 ✅')
      }).catch((e) => {
        console.log('🔓 [TTS] HTML5 Audio unlock 실패:', e.message)
      })
    }
  } catch (e) {
    console.log('🔓 [TTS] HTML5 Audio 예외:', e)
  }

  // 2. Web Speech API unlock
  if ('speechSynthesis' in window) {
    try {
      speechSynthesis.resume()
      // 빈 발화로 활성화 (안드로이드에서 중요)
      const utterance = new SpeechSynthesisUtterance('')
      utterance.volume = 0
      utterance.rate = 10
      speechSynthesis.speak(utterance)
      console.log('🔓 [TTS] speechSynthesis unlock 요청')
    } catch (e) {
      console.log('🔓 [TTS] speechSynthesis 예외:', e)
    }
  }

  // 3. AudioContext unlock
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      const ctx = new AudioContextClass()
      // 짧은 소리 생성
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      gainNode.gain.value = 0.001
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.001)

      ctx.resume().then(() => {
        console.log('🔓 [TTS] AudioContext unlock 성공')
        setTimeout(() => ctx.close(), 100)
      }).catch(() => {})
    }
  } catch (e) {}
}

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isLoadingRef = useRef(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const prefetchingRef = useRef<Set<string>>(new Set())
  const ttsStartedRef = useRef(false)
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  // 음성 목록 사전 로드
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

    // 여러 번 재시도 (안드로이드는 더 오래 걸림)
    const retryTimers = [
      setTimeout(loadVoices, 100),
      setTimeout(loadVoices, 500),
      setTimeout(loadVoices, 1000),
      setTimeout(loadVoices, 2000),
      setTimeout(loadVoices, 3000),
    ]

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      retryTimers.forEach(clearTimeout)
    }
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

  // ⭐ Audio API로 재생 (Google TTS) - 안드로이드 강화 버전
  const playWithAudio = useCallback(async (text: string, retry = 0): Promise<boolean> => {
    try {
      // 캐시 확인
      let blobUrl = audioCache.get(text)

      if (!blobUrl) {
        // API 호출
        blobUrl = await fetchTTSData(text)
      }

      return new Promise((resolve) => {
        // ⭐⭐⭐ 안드로이드: 새 Audio 요소 생성 (매번 새로 만드는 것이 더 안정적)
        const audio = new Audio()
        audioRef.current = audio

        // ⭐ 안드로이드: 속성 설정 순서가 중요!
        audio.preload = 'auto'
        audio.crossOrigin = 'anonymous'
        audio.volume = 1
        audio.muted = false
        // iOS/안드로이드 인라인 재생 (HTMLAudioElement에는 타입이 없어서 setAttribute 사용)
        audio.setAttribute('playsinline', 'true')
        audio.setAttribute('webkit-playsinline', 'true')

        const cleanup = () => {
          audio.onplay = null
          audio.onended = null
          audio.onerror = null
          audio.oncanplaythrough = null
          audio.onloadeddata = null
        }

        let playAttempted = false

        // ⭐ 안드로이드: onloadeddata가 더 먼저 발생할 수 있음
        const attemptPlay = async () => {
          if (playAttempted) return
          playAttempted = true

          console.log('📥 [TTS] Audio 데이터 로드됨, 재생 시도')

          try {
            // ⭐ 안드로이드: play() 전에 currentTime 리셋
            audio.currentTime = 0
            await audio.play()
            console.log('🔊 [TTS] Audio play() 성공 ✅')
          } catch (e: any) {
            console.error('❌ [TTS] Audio play() 실패:', e.message)
            cleanup()

            // ⭐ 재시도 (최대 3회로 증가)
            if (retry < 3) {
              console.log(`🔄 [TTS] 재시도 ${retry + 1}/3`)
              unlockAudioGlobal()
              await new Promise(r => setTimeout(r, 300 * (retry + 1))) // 점진적 딜레이
              const retryResult = await playWithAudio(text, retry + 1)
              resolve(retryResult)
            } else {
              resolve(false)
            }
          }
        }

        audio.oncanplaythrough = attemptPlay
        audio.onloadeddata = attemptPlay  // 안드로이드에서 더 빨리 발생

        audio.onplay = () => {
          console.log('▶️ [TTS] Audio 재생 시작:', text)
          setIsPlaying(true)
        }

        audio.onended = () => {
          console.log('⏹️ [TTS] Audio 재생 종료:', text)
          setIsPlaying(false)
          audioRef.current = null
          cleanup()
          resolve(true)
        }

        audio.onerror = async (e) => {
          console.error('❌ [TTS] Audio 오류:', e)
          setIsPlaying(false)
          audioRef.current = null
          cleanup()

          if (retry < 3) {
            console.log(`🔄 [TTS] 오류 후 재시도 ${retry + 1}/3`)
            unlockAudioGlobal()
            await new Promise(r => setTimeout(r, 300 * (retry + 1)))
            const retryResult = await playWithAudio(text, retry + 1)
            resolve(retryResult)
          } else {
            resolve(false)
          }
        }

        // ⭐⭐⭐ 안드로이드 핵심: src 설정 후 load() 명시적 호출
        audio.src = blobUrl!
        audio.load()  // 안드로이드에서 중요!

        // ⭐ 6초 타임아웃
        setTimeout(() => {
          if (audioRef.current === audio && !audio.ended && !playAttempted) {
            console.log('⏱️ [TTS] 6초 타임아웃 - 강제 재생 시도')
            attemptPlay()
          }
        }, 6000)
      })
    } catch (error) {
      console.error('❌ [TTS] Audio 재생 예외:', error)
      return false
    }
  }, [fetchTTSData])

  // ⭐ 브라우저 TTS로 재생 (폴백용) - 타임아웃 증가
  const playWithBrowserTTS = useCallback((text: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.log('❌ [TTS] speechSynthesis 미지원')
        resolve(false)
        return
      }

      try {
        ttsStartedRef.current = false

        // ⭐ 먼저 cancel 후 약간의 딜레이
        speechSynthesis.cancel()

        setTimeout(() => {
          speechSynthesis.resume()

          const voices = voicesRef.current.length > 0 ? voicesRef.current : speechSynthesis.getVoices()

          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = 'en-US'
          utterance.rate = 0.9
          utterance.volume = 1
          utterance.pitch = 1

          // 영어 음성 선택
          if (voices.length > 0) {
            const enVoice = voices.find(v =>
              v.lang.startsWith('en') &&
              (v.name.includes('Google') || v.name.includes('US') || v.name.includes('English'))
            ) || voices.find(v => v.lang === 'en-US')
              || voices.find(v => v.lang.startsWith('en'))

            if (enVoice) {
              utterance.voice = enVoice
              console.log('🎤 [TTS] 선택된 음성:', enVoice.name)
            }
          } else {
            console.log('⚠️ [TTS] 음성 목록 없음')
          }

          utterance.onstart = () => {
            console.log('▶️ [TTS] 브라우저 TTS 시작:', text)
            ttsStartedRef.current = true
            setIsPlaying(true)
            if (fallbackTimeoutRef.current) {
              clearTimeout(fallbackTimeoutRef.current)
              fallbackTimeoutRef.current = null
            }
          }

          utterance.onend = () => {
            console.log('⏹️ [TTS] 브라우저 TTS 종료:', text)
            setIsPlaying(false)
            resolve(true)
          }

          utterance.onerror = (event) => {
            if (event.error === 'interrupted') {
              console.log('⚠️ [TTS] 발화 중단됨')
            } else {
              console.error('❌ [TTS] 브라우저 TTS 오류:', event.error)
            }
            setIsPlaying(false)
            resolve(false)
          }

          speechSynthesis.speak(utterance)
          console.log('📢 [TTS] speechSynthesis.speak() 호출')

          // ⭐ 안드로이드: 1.5초로 타임아웃 증가 (음성 엔진 초기화 시간)
          const timeout = isAndroid ? 1500 : 800
          fallbackTimeoutRef.current = setTimeout(() => {
            if (!ttsStartedRef.current) {
              console.log(`⚠️ [TTS] ${timeout}ms 내에 시작 안 됨 - 실패`)
              speechSynthesis.cancel()
              resolve(false)
            }
          }, timeout)
        }, isAndroid ? 100 : 50) // 안드로이드는 딜레이 더 줌

      } catch (error) {
        console.error('❌ [TTS] 브라우저 TTS 예외:', error)
        resolve(false)
      }
    })
  }, [])

  // ⭐⭐⭐ 메인 speak 함수 - 안드로이드도 Audio API 우선 사용
  const speak = useCallback(async (text: string) => {
    console.log('🎯 [TTS] speak 호출:', text, isAndroid ? '(안드로이드)' : '')

    // 이전 재생 중지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
      fallbackTimeoutRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    setIsPlaying(false)

    if (isLoadingRef.current) {
      console.log('⚠️ [TTS] 이미 로딩 중')
      return
    }

    // 오디오 unlock
    unlockAudioGlobal()

    retryCountRef.current = 0
    isLoadingRef.current = true
    setIsLoading(true)

    // ⭐⭐⭐ 핵심 변경: 안드로이드도 Google TTS API (Audio) 먼저 사용
    // 브라우저 TTS는 불안정하므로 API 실패 시에만 폴백

    // 1. 캐시 확인 또는 API 호출
    const hasCached = audioCache.has(text)

    if (!hasCached) {
      // 백그라운드에서 캐싱 시작 (비동기)
      fetchTTSData(text).catch(() => {
        console.log('⚠️ [TTS] 백그라운드 캐싱 실패')
      })
    }

    // ⭐ 전략: Audio API 먼저 시도 (모든 플랫폼)
    console.log('🔊 [TTS] Audio API 시도 (캐시:', hasCached ? 'O' : 'X', ')')

    // 캐시가 없으면 약간 대기 (API 응답 기다림)
    if (!hasCached) {
      await new Promise(r => setTimeout(r, 300))
    }

    const audioSuccess = await playWithAudio(text)

    if (!audioSuccess) {
      console.log('⚠️ [TTS] Audio 실패, 브라우저 TTS 폴백 시도')

      // ⭐ 브라우저 TTS 폴백 (안드로이드에서도 시도)
      const browserSuccess = await playWithBrowserTTS(text)

      if (!browserSuccess) {
        console.error('❌ [TTS] 모든 방법 실패')

        // ⭐ 최후의 수단: 직접 Audio 재생 재시도
        if (audioCache.has(text)) {
          console.log('🔄 [TTS] 마지막 시도: 캐시된 Audio 직접 재생')
          try {
            const audio = new Audio(audioCache.get(text)!)
            audio.volume = 1
            await audio.play()
            setIsPlaying(true)
            audio.onended = () => setIsPlaying(false)
          } catch (e) {
            console.error('❌ [TTS] 최종 실패:', e)
          }
        }
      }
    }

    isLoadingRef.current = false
    setIsLoading(false)
  }, [playWithAudio, playWithBrowserTTS, fetchTTSData])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
      fallbackTimeoutRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    setIsPlaying(false)
  }, [])

  return { speak, stop, prefetchTTS, isPlaying, isLoading }
}
