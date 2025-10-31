import Papa from 'papaparse'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

interface SheetData {
  title: string
  words: Array<{
    word_text: string
    meaning: string
    example?: string
    example_translation?: string
    mnemonic?: string
  }>
}

// URL에서 Spreadsheet ID 추출
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

// gid 추출 (시트 탭 ID)
export function extractGid(url: string): string {
  const match = url.match(/gid=([0-9]+)/)
  return match ? match[1] : '0'
}

// 시트 제목 가져오기
export async function getSheetTitle(spreadsheetId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}&fields=properties.title`
    )
    
    if (!response.ok) {
      throw new Error('API 요청 실패')
    }
    
    const data = await response.json()
    return data.properties.title
  } catch (error) {
    console.error('시트 제목 가져오기 실패:', error)
    return '새 단어장'
  }
}

// CSV 데이터 가져오기
export async function fetchSheetData(sheetUrl: string): Promise<SheetData> {
  const spreadsheetId = extractSpreadsheetId(sheetUrl)
  if (!spreadsheetId) {
    throw new Error('유효하지 않은 구글 시트 URL입니다')
  }
  
  const gid = extractGid(sheetUrl)
  
  // 1. 제목 가져오기
  const title = await getSheetTitle(spreadsheetId)
  
  // 2. CSV 데이터 가져오기
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
  const response = await fetch(csvUrl)
  
  if (!response.ok) {
    throw new Error('시트를 불러올 수 없습니다. 공유 설정을 확인해주세요.')
  }
  
  const csvText = await response.text()
  
  // 3. CSV 파싱 (순서 기반, 헤더 무시)
  const parsed = Papa.parse<any>(csvText, {
    header: false,
    skipEmptyLines: true
  })
  
  if (parsed.errors.length > 0) {
    console.error('CSV 파싱 오류:', parsed.errors)
  }
  
  // 첫 번째 행은 헤더로 간주하고 제외, 2행부터 데이터로 처리
  const dataRows = parsed.data.slice(1)
  
  // 컬럼 순서: A=word_text, B=meaning, C=mnemonic, D=example, E=example_translation
  const words = dataRows.map((row: any[]) => ({
    word_text: row[0]?.toString().trim() || '',
    meaning: row[1]?.toString().trim() || '',
    mnemonic: row[2]?.toString().trim() || undefined,
    example: row[3]?.toString().trim() || undefined,
    example_translation: row[4]?.toString().trim() || undefined
  })).filter(word => word.word_text && word.meaning) // 필수값이 있는 행만 포함
  
  return {
    title,
    words
  }
}

