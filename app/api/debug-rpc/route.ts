import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const studentId = 'd1d7f15f-dabc-4e7f-a865-8c13a22612a8'
    const assignmentId = 'bd6fb05d-bd14-4134-b605-41d2fb2f6cec'

    // 1. assignment 정보 확인
    const { data: assignment, error: assignmentError } = await supabase
      .from('student_wordlists')
      .select('*')
      .eq('id', assignmentId)
      .single()

    if (assignmentError) {
      return NextResponse.json({ 
        step: 'assignment_fetch',
        error: assignmentError.message 
      }, { status: 500 })
    }

    // 2. wordlist의 전체 단어 수 확인
    const { data: totalWords, error: totalError } = await supabase
      .from('words')
      .select('id', { count: 'exact' })
      .eq('wordlist_id', assignment.wordlist_id)

    if (totalError) {
      return NextResponse.json({ 
        step: 'total_words_count',
        error: totalError.message 
      }, { status: 500 })
    }

    // 3. 81-100번 단어의 진행 상태 확인
    const { data: words81to100, error: wordsError } = await supabase
      .from('words')
      .select('id, word_text, sequence_order')
      .eq('wordlist_id', assignment.wordlist_id)
      .gte('sequence_order', 81)
      .lte('sequence_order', 100)
      .order('sequence_order', { ascending: true })

    if (wordsError) {
      return NextResponse.json({ 
        step: 'words_81_100_fetch',
        error: wordsError.message 
      }, { status: 500 })
    }

    const wordIds = words81to100?.map(w => w.id) || []

    // 4. 해당 단어들의 진행 상태 확인
    const { data: progress, error: progressError } = await supabase
      .from('student_word_progress')
      .select('*')
      .eq('student_id', studentId)
      .in('word_id', wordIds)

    if (progressError) {
      return NextResponse.json({ 
        step: 'progress_fetch',
        error: progressError.message 
      }, { status: 500 })
    }

    // 5. RPC 직접 호출
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_next_word', {
        p_student_id: studentId,
        p_assignment_id: assignmentId
      })

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        wordlist_id: assignment.wordlist_id,
        filtered_word_ids: assignment.filtered_word_ids,
        filtered_count: assignment.filtered_word_ids?.length || 0,
        generation: assignment.generation,
        is_auto_generated: assignment.is_auto_generated
      },
      wordlist: {
        total_words: totalWords?.length || 0
      },
      words_81_100: {
        count: words81to100?.length || 0,
        words: words81to100?.slice(0, 5).map(w => ({ id: w.id, text: w.word_text, order: w.sequence_order }))
      },
      progress: {
        count: progress?.length || 0,
        statuses: progress?.map(p => ({ word_id: p.word_id, status: p.status }))
      },
      rpc_result: {
        data: rpcResult,
        error: rpcError?.message || null,
        has_data: rpcResult && rpcResult.length > 0
      }
    })
  } catch (err: any) {
    return NextResponse.json({ 
      step: 'unknown',
      error: err.message 
    }, { status: 500 })
  }
}


