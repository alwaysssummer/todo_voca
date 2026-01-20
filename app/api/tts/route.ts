import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY
    console.log('🔑 [TTS] API Key exists:', !!apiKey)
    console.log('🔑 [TTS] API Key length:', apiKey?.length)
    
    if (!apiKey) {
      // API 키 미설정은 운영상 정상적인 상황일 수 있음 (브라우저 TTS 폴백 사용)
      console.warn('⚠️ [TTS] GOOGLE_CLOUD_TTS_API_KEY 미설정 - 클라이언트에서 브라우저 TTS 사용')
      return NextResponse.json(
        { error: 'TTS API key not configured - using browser fallback' },
        { status: 503 }
      )
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Wavenet-D', // 자연스러운 남성 목소리
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9, // 약간 천천히 (학습용)
            pitch: 0,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ [TTS] Google TTS API Error:', error)
      console.error('❌ [TTS] Response status:', response.status)
      return NextResponse.json(
        { error: error.error?.message || 'TTS failed' }, 
        { status: response.status }
      )
    }
    
    console.log('✅ [TTS] Google TTS API 호출 성공')

    const data = await response.json()
    
    // base64 인코딩된 오디오 반환
    return NextResponse.json({ audioContent: data.audioContent })
  } catch (error) {
    console.error('TTS Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

