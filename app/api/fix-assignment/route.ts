import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. 1차 세대 assignment 찾기
    const { data: assignments, error: fetchError } = await supabase
      .from('student_wordlists')
      .select('*')
      .eq('generation', 1)
      .eq('is_auto_generated', false)
      .limit(1)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const assignment = assignments[0]

    // 2. filtered_word_ids를 NULL로 업데이트
    const { error: updateError } = await supabase
      .from('student_wordlists')
      .update({ filtered_word_ids: null })
      .eq('id', assignment.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'filtered_word_ids가 NULL로 업데이트되었습니다. 전체 100개 단어를 사용합니다.',
      assignment_id: assignment.id
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

