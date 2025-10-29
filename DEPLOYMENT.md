# 🚀 Vercel 배포 가이드

이 문서는 Todo Voca를 Vercel에 배포하는 전체 과정을 단계별로 안내합니다.

## 📋 목차

1. [사전 준비](#사전-준비)
2. [Vercel 배포](#vercel-배포)
3. [환경 변수 설정](#환경-변수-설정)
4. [배포 후 확인](#배포-후-확인)
5. [문제 해결](#문제-해결)

---

## 사전 준비

### ✅ 체크리스트

배포 전에 다음 항목들을 확인하세요:

- [x] Supabase 프로젝트 생성 완료
- [x] 데이터베이스 스키마 실행 완료 (`lib/supabase/database.sql`)
- [x] 샘플 데이터 입력 완료 (`lib/supabase/sample-data.sql`)
- [x] 로컬 환경에서 정상 작동 확인
- [x] Git 저장소에 코드 푸시 완료
- [ ] Google Sheets API Key 발급 (선택)

### 📦 필요한 정보

다음 정보를 미리 준비하세요:

1. **Supabase 정보** (필수)
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

2. **Google API Key** (선택)
   - Google Sheets API Key (단어장 추가 기능용)

---

## Vercel 배포

### Step 1: Vercel 계정 생성 및 로그인

1. [Vercel](https://vercel.com) 접속
2. "Sign Up" 클릭 또는 GitHub 계정으로 로그인
3. GitHub 연동 승인

### Step 2: 새 프로젝트 생성

1. Vercel Dashboard에서 **"Add New"** → **"Project"** 클릭
2. GitHub 저장소 목록에서 `todo_voca` 선택
3. "Import" 클릭

### Step 3: 프로젝트 설정

#### Build Settings (자동 감지됨)
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

> ⚠️ 설정을 변경하지 마세요. Next.js는 자동으로 감지됩니다.

### Step 4: 환경 변수 설정

**Environment Variables** 섹션에서 다음 변수들을 추가:

#### 필수 환경 변수

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | All (Production, Preview, Development) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | All |

#### 선택 환경 변수

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_GOOGLE_API_KEY` | `AIzaSyA...` | All (선택) |

**Environment 선택:**
- ✅ **Production** (프로덕션)
- ✅ **Preview** (PR 미리보기)
- ✅ **Development** (개발 환경)

### Step 5: 배포 시작

1. 환경 변수 입력 완료 후 **"Deploy"** 클릭
2. 빌드 로그 확인 (약 2-3분 소요)
3. 배포 완료 대기

---

## 환경 변수 설정

### Supabase 환경 변수 찾기

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **API** 클릭
4. 다음 정보 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Google Sheets API Key 설정 (선택)

단어장 추가 기능을 사용하려면:

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** → **Library**
4. "Google Sheets API" 검색 후 활성화
5. **Credentials** → **Create Credentials** → **API Key**
6. 생성된 키를 `NEXT_PUBLIC_GOOGLE_API_KEY`에 입력

#### API Key 보안 설정 (중요!)

1. 생성된 API Key 클릭
2. **Application restrictions**:
   - **HTTP referrers** 선택
   - 다음 도메인 추가:
     - `https://your-app.vercel.app/*`
     - `https://*.vercel.app/*` (Preview 환경용)
3. **API restrictions**:
   - **Restrict key** 선택
   - **Google Sheets API**만 체크
4. **Save**

---

## 배포 후 확인

### ✅ 배포 성공 확인

배포가 완료되면 다음을 확인하세요:

#### 1. 홈페이지 접속
```
https://your-app.vercel.app
```
- ✅ "Todo Voca" 타이틀 표시
- ✅ "강사 로그인" 버튼 작동

#### 2. 강사 로그인
```
https://your-app.vercel.app/teacher/login
```
- 아이디: `teacher`
- 비밀번호: `7136`
- ✅ 대시보드 접속 성공

#### 3. 학생 학습 페이지
```
https://your-app.vercel.app/s/10000001-0000-0000-0000-000000000001
```
- ✅ 김철수 학생 정보 표시
- ✅ 단어 학습 화면 정상 표시
- ✅ "안다"/"모른다" 버튼 작동

#### 4. 단어장 추가 기능 (Google API Key 설정 시)
```
https://your-app.vercel.app/teacher/dashboard
```
- ✅ "단어장 추가" 버튼 클릭
- ✅ Google Sheet URL 입력
- ✅ 단어 목록 미리보기 표시
- ✅ 단어장 생성 성공

### 📊 Vercel Dashboard 확인

1. **Deployments** 탭:
   - ✅ 배포 상태: Ready
   - ✅ 빌드 시간: 2-3분
   - ✅ 에러 없음

2. **Analytics** 탭 (선택):
   - 방문자 수 확인
   - 페이지 로딩 시간 확인

3. **Logs** 탭:
   - 런타임 에러 확인
   - API 요청 로그 확인

---

## 문제 해결

### 🔴 배포 실패: "Build Failed"

#### 원인 1: 환경 변수 누락
```
Error: Supabase URL or Key is missing
```

**해결:**
1. Vercel Dashboard → Settings → Environment Variables
2. `NEXT_PUBLIC_SUPABASE_URL` 확인
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` 확인
4. Redeploy

#### 원인 2: TypeScript 에러
```
Error: Type error in components/...
```

**해결:**
1. 로컬에서 빌드 테스트:
```bash
npm run build
```
2. 에러 수정 후 Git push
3. Vercel 자동 재배포

### 🟡 배포 성공 but 페이지 오류

#### 문제 1: "Supabase connection failed"

**해결:**
1. 브라우저 Console 열기 (F12)
2. 에러 메시지 확인
3. Supabase Dashboard에서 프로젝트 상태 확인
4. 환경 변수 값이 정확한지 재확인

#### 문제 2: "Student not found"

**해결:**
1. Supabase Dashboard → SQL Editor
2. 샘플 데이터 재실행:
```sql
-- lib/supabase/sample-data.sql 내용 실행
```
3. 페이지 새로고침

#### 문제 3: Google Sheets API 에러

```
Error: Failed to fetch sheet data
```

**해결:**
1. Google Sheet이 "링크가 있는 모든 사용자"에게 공개되어 있는지 확인
2. Google Cloud Console에서 API Key 제한 확인:
   - HTTP referrer에 Vercel 도메인 추가
3. Vercel 환경 변수에 `NEXT_PUBLIC_GOOGLE_API_KEY` 확인

### 🟢 성능 최적화

#### Vercel Analytics 활성화

1. Vercel Dashboard → Analytics 탭
2. "Enable Analytics" 클릭
3. Real-time 성능 모니터링

#### Edge Functions (선택)

Next.js 15는 자동으로 Edge에 최적화됩니다. 추가 설정 불필요!

---

## 🔄 재배포 방법

### 자동 배포 (권장)

Git에 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update: 기능 개선"
git push origin main
```

Vercel이 자동으로:
1. 코드 변경 감지
2. 빌드 시작
3. 배포 완료
4. 알림 전송

### 수동 재배포

1. Vercel Dashboard → Deployments
2. 원하는 배포 선택
3. **"···"** → **"Redeploy"** 클릭

---

## 📝 배포 후 체크리스트

배포가 완료되면 다음 항목들을 확인하세요:

- [ ] 홈페이지 정상 표시
- [ ] 강사 로그인 작동
- [ ] 학생 학습 페이지 작동
- [ ] Supabase 데이터 연동 확인
- [ ] Google Sheets API 작동 (설정 시)
- [ ] 모바일 반응형 확인
- [ ] Console 에러 없음
- [ ] README.md 배포 URL 업데이트
- [ ] 팀원들에게 배포 URL 공유

---

## 🎯 다음 단계

배포가 성공적으로 완료되었다면:

1. ✅ 실제 학생/강사에게 테스트 요청
2. ✅ 피드백 수집
3. ✅ 버그 수정 및 기능 개선
4. ✅ Custom Domain 설정 (선택)
   - Vercel Dashboard → Settings → Domains
   - 원하는 도메인 추가

---

## 🆘 추가 도움말

### Vercel 공식 문서
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

### Supabase 공식 문서
- [Supabase with Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

### 문의
- GitHub Issues: [프로젝트 저장소]
- Email: [your-email@example.com]

---

**배포 완료를 축하합니다! 🎉**

