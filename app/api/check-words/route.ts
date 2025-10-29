import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. 기초 영단어 100의 81-100번 단어 ID 가져오기
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word_text, sequence_order')
      .gte('sequence_order', 81)
      .lte('sequence_order', 100)
      .order('sequence_order', { ascending: true })

    if (wordsError) {
      return NextResponse.json({ error: wordsError.message }, { status: 500 })
    }

    if (!words || words.length === 0) {
      return NextResponse.json({ error: '81-100번 단어를 찾을 수 없습니다' }, { status: 404 })
    }

    const wordIds = words.map(w => w.id)

    // 2. 이 단어들의 student_word_progress 확인
    const { data: progress, error: progressError } = await supabase
      .from('student_word_progress')
      .select('*')
      .in('word_id', wordIds)

    if (progressError) {
      return NextResponse.json({ error: progressError.message }, { status: 500 })
    }

    return NextResponse.json({
      words: words.map(w => ({ id: w.id, text: w.word_text, order: w.sequence_order })),
      progress: progress || [],
      message: `81-100번 단어: ${words.length}개, 진행 상태: ${progress?.length || 0}개`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

