import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const studentId = 'd1d7f15f-dabc-4e7f-a865-8c13a22612a8' // ⭐ 실제 학생 ID

    // 1. 기초 영단어 100의 81-100번 단어 ID 가져오기
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id')
      .gte('sequence_order', 81)
      .lte('sequence_order', 100)

    if (wordsError) {
      return NextResponse.json({ error: wordsError.message }, { status: 500 })
    }

    const wordIds = words?.map(w => w.id) || []

    // 2. 해당 학생의 81-100번 단어 진행 상태 삭제
    const { error: deleteError } = await supabase
      .from('student_word_progress')
      .delete()
      .eq('student_id', studentId)
      .in('word_id', wordIds)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `학생 ${studentId}의 81-100번 단어 진행 상태가 초기화되었습니다.`,
      deletedWordIds: wordIds
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


