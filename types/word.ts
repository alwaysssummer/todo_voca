export interface Word {
  id: number
  wordlist_id: string
  word_text: string
  meaning: string
  example?: string
  example_translation?: string
  mnemonic?: string
  audio_url?: string
  sequence_order: number
  created_at: string
}

export interface Wordlist {
  id: string
  name: string
  total_words: number
  created_by: string
  created_at: string
  updated_at: string
}

