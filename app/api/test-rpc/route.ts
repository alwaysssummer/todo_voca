import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // get_next_word RPC 직접 호출
    const { data, error } = await supabase.rpc('get_next_word', {
      p_student_id: 'd1d7f15f-dabc-4e7f-a865-8c13a22612a8',
      p_assignment_id: 'bd6fb05d-bd14-4134-b605-41d2fb2f6cec'
    })

    return NextResponse.json({
      data,
      error: error ? error.message : null,
      message: data && data.length > 0 ? `✅ 다음 단어: ${data[0].word_text}` : '❌ 단어 없음'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

