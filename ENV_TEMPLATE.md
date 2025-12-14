# 환경 변수 설정 가이드

## 📋 `.env.local` 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 입력하세요.

```env
# =============================================================================
# Supabase Configuration (필수)
# =============================================================================

# Supabase 프로젝트 URL
# Supabase Dashboard → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anonymous Key
# Supabase Dashboard → Settings → API → Project API keys → anon/public
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# =============================================================================
# Google Cloud TTS API (필수 - 발음 기능용)
# =============================================================================

# Google Cloud Text-to-Speech API Key
# 없으면 브라우저 기본 TTS로 폴백 (한국식 발음)
GOOGLE_CLOUD_TTS_API_KEY=your-google-cloud-tts-api-key-here

# =============================================================================
# Google Sheets API (선택 - 단어장 추가 기능용)
# =============================================================================

# Google Cloud Console에서 발급 (선택사항)
# 없으면 단어장 추가 기능만 작동하지 않습니다
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key-here
```

## 🔑 Supabase 설정 방법

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 및 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. Region 선택 (Seoul 권장)
5. 프로젝트 생성 완료 대기

### 2. API Keys 확인

1. Supabase Dashboard → Settings → API
2. **Project URL** 복사 → `NEXT_PUBLIC_SUPABASE_URL`에 입력
3. **anon/public** 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력

### 3. 데이터베이스 설정

1. Supabase Dashboard → SQL Editor
2. `lib/supabase/database.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 실행
4. `lib/supabase/sample-data.sql` 파일 내용 복사
5. SQL Editor에 붙여넣고 실행 (샘플 데이터)

## 🔑 Google Cloud TTS API 설정 (필수 - 발음 기능)

원어민 발음 기능을 사용하려면 Google Cloud Text-to-Speech API Key가 필요합니다.

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** → **Library**
4. "Cloud Text-to-Speech API" 검색 후 **ENABLE** 클릭
5. **Billing 활성화 필요** (무료 할당량: 월 100만 글자)

### 2. API Key 생성

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **API Key**
3. 생성된 키 복사
4. `.env.local`의 `GOOGLE_CLOUD_TTS_API_KEY`에 입력

### 3. API Key 보안 설정 (중요!)

1. 생성된 API Key 클릭
2. **API restrictions**:
   - **Restrict key** 선택
   - **Cloud Text-to-Speech API**만 선택
3. **Save** 클릭

⚠️ **주의:** 서버 사이드에서 사용하므로 HTTP referrer 제한은 불필요

---

## 🔑 Google Sheets API 설정 (선택 - 단어장 추가 기능)

단어장 추가 기능을 사용하려면 Google API Key가 필요합니다.

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** → **Library**
4. "Google Sheets API" 검색 후 활성화

### 2. API Key 생성

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **API Key**
3. 생성된 키 복사
4. `.env.local`의 `NEXT_PUBLIC_GOOGLE_API_KEY`에 입력

### 3. API Key 보안 설정 (중요!)

1. 생성된 API Key 클릭
2. **Application restrictions**:
   - **HTTP referrers (web sites)** 선택
   - **Add an item**:
     - 개발: `http://localhost:3000/*`
     - 배포: `https://your-domain.vercel.app/*`
3. **API restrictions**:
   - **Restrict key** 선택
   - **Google Sheets API**만 선택
4. **Save** 클릭

## ⚠️ 주의사항

### 보안
- `.env.local` 파일은 절대 Git에 커밋하지 마세요!
- `.gitignore`에 이미 포함되어 있습니다.
- `NEXT_PUBLIC_*` 변수는 클라이언트에 노출됩니다.

### Vercel 배포 시
- Vercel Dashboard → Settings → Environment Variables
- 위의 환경 변수들을 동일하게 입력
- **중요:** `GOOGLE_CLOUD_TTS_API_KEY`는 반드시 추가!
- Production, Preview, Development 환경 모두 선택

## ✅ 설정 확인

환경 변수가 올바르게 설정되었는지 확인:

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 확인
# - Console에 "⚠️ Supabase URL or Key is missing" 에러가 없어야 함
# - http://localhost:3000/teacher/login 접속 가능
# - http://localhost:3000/s/10000001-0000-0000-0000-000000000001 접속 가능
```

## 🆘 문제 해결

### "Supabase URL or Key is missing" 에러
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 파일 이름이 정확한지 확인 (`.env.local`, 앞에 점 있음)
- 개발 서버 재시작 (`Ctrl+C` → `npm run dev`)

### Google Sheets API 에러
- API Key가 올바른지 확인
- Google Sheets API가 활성화되어 있는지 확인
- HTTP referrer 제한이 올바른지 확인
- Google Sheet이 "링크가 있는 모든 사용자"에게 공개되어 있는지 확인

