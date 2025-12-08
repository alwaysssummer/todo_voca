import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY
    if (!apiKey) {
      console.error('GOOGLE_CLOUD_TTS_API_KEY is not configured')
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
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
      console.error('Google TTS Error:', error)
      return NextResponse.json(
        { error: error.error?.message || 'TTS failed' }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // base64 인코딩된 오디오 반환
    return NextResponse.json({ audioContent: data.audioContent })
  } catch (error) {
    console.error('TTS Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

