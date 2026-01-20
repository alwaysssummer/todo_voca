import Papa from 'papaparse'
import type { SheetData, SheetRow, ParsedSheetWord } from '@/types/database'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

// Re-export for backwards compatibility
export type { SheetData }

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

// Google Sheets API를 사용한 데이터 가져오기
export async function fetchSheetData(sheetUrl: string): Promise<SheetData> {
  const spreadsheetId = extractSpreadsheetId(sheetUrl)
  if (!spreadsheetId) {
    throw new Error('유효하지 않은 구글 시트 URL입니다')
  }
  
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API Key가 설정되지 않았습니다. .env.local 파일을 확인해주세요.')
  }
  
  try {
    // 1. 스프레드시트 정보 가져오기 (제목 + 시트 이름)
    const metaResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`
    )
    
    if (!metaResponse.ok) {
      if (metaResponse.status === 403) {
        throw new Error('Google Sheets API 권한이 없습니다. API Key를 확인해주세요.')
      }
      if (metaResponse.status === 404) {
        throw new Error('시트를 찾을 수 없습니다. URL과 공유 설정을 확인해주세요.')
      }
      throw new Error(`API 오류 (${metaResponse.status})`)
    }
    
    const metaData = await metaResponse.json()
    const title = metaData.properties.title
    const sheetName = metaData.sheets[0].properties.title // 첫 번째 시트 이름
    
    // 2. 시트 데이터 가져오기 (A:E 범위, 모든 행)
    const dataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:E?key=${GOOGLE_API_KEY}`
    )
    
    if (!dataResponse.ok) {
      throw new Error('시트 데이터를 불러올 수 없습니다.')
  }
  
    const dataJson = await dataResponse.json()
    const rows = dataJson.values || []
    
    if (rows.length < 2) {
      throw new Error('시트에 데이터가 없습니다. (최소 헤더 + 1개 행 필요)')
    }
    
    // 3. 첫 번째 행은 헤더로 간주하고 제외, 2행부터 데이터로 처리
    const dataRows = rows.slice(1)
    
    // 컬럼 순서: A=word_text, B=meaning, C=mnemonic, D=example, E=example_translation
    const words: ParsedSheetWord[] = dataRows
      .map((row: SheetRow): ParsedSheetWord => ({
        word_text: row[0]?.toString().trim() || '',
        meaning: row[1]?.toString().trim() || '',
        mnemonic: row[2]?.toString().trim() || undefined,
        example: row[3]?.toString().trim() || undefined,
        example_translation: row[4]?.toString().trim() || undefined
      }))
      .filter((word: ParsedSheetWord): word is ParsedSheetWord =>
        Boolean(word.word_text && word.meaning)
      ) // 필수값이 있는 행만 포함
    
    if (words.length === 0) {
      throw new Error('유효한 단어가 없습니다. A열(영단어)과 B열(뜻)을 확인해주세요.')
  }
  
  return {
    title,
      words
    }
  } catch (error) {
    console.error('시트 불러오기 실패:', error)
    throw error
  }
}

