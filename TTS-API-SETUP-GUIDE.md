# 🎤 Google Cloud TTS API 설정 가이드

**문제:** 서버에서 한국식 영어 발음으로 나옴  
**원인:** `GOOGLE_CLOUD_TTS_API_KEY` 환경 변수 미설정  
**해결:** 아래 가이드대로 API 키 설정

---

## 🚨 증상 확인

### 로컬 (localhost)
- ✅ 원어민 발음 (Google Cloud TTS)

### 서버 (Vercel/배포)
- ❌ 한국식 영어 발음 (브라우저 기본 TTS로 폴백)

---

## 🔍 원인

`app/api/tts/route.ts`:
```typescript
const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY
if (!apiKey) {
  // ❌ API 키 없음 → 에러 → 폴백 발동
}
```

**폴백 TTS** (`hooks/useTTS.ts`):
```typescript
// 브라우저 기본 speechSynthesis 사용
const utterance = new SpeechSynthesisUtterance(text)
utterance.lang = 'en-US'
speechSynthesis.speak(utterance)
// → 시스템 음성 사용 (한국식 발음)
```

---

## ✅ 해결 방법

### Step 1: Google Cloud TTS API 활성화

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com

2. **프로젝트 선택 또는 생성**
   - 좌측 상단에서 프로젝트 선택

3. **Cloud Text-to-Speech API 활성화**
   - 좌측 메뉴: **APIs & Services** → **Library**
   - 검색: "Cloud Text-to-Speech API"
   - **ENABLE** 클릭

4. **Billing 활성화** (필수)
   - 좌측 메뉴: **Billing**
   - 결제 계정 연결
   - **무료 할당량:** 월 100만 글자 (일반 사용 충분)
   - 초과 시: 100만 글자당 $16

---

### Step 2: API Key 생성

1. **Credentials 페이지 이동**
   - 좌측 메뉴: **APIs & Services** → **Credentials**

2. **API Key 생성**
   - 상단: **+ CREATE CREDENTIALS**
   - **API Key** 선택
   - 팝업에서 키 복사 (한 번만 표시됨!)

3. **API Key 제한 설정** (보안)
   - 생성된 키 이름 클릭
   - **API restrictions** 섹션:
     - ☑️ **Restrict key** 선택
     - **Cloud Text-to-Speech API** 선택
   - **Save** 클릭

---

### Step 3: 환경 변수 설정

#### 로컬 개발 (`.env.local`)

프로젝트 루트에 `.env.local` 파일:
```env
GOOGLE_CLOUD_TTS_API_KEY=AIzaSy...your-api-key-here
```

#### Vercel 배포

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard

2. **프로젝트 선택**

3. **Settings → Environment Variables**

4. **새 변수 추가:**
   - **Name:** `GOOGLE_CLOUD_TTS_API_KEY`
   - **Value:** (생성한 API Key 붙여넣기)
   - **Environments:** ☑️ Production, ☑️ Preview, ☑️ Development 모두 체크

5. **Save** 클릭

6. **재배포 필요**
   - Deployments 탭
   - 최신 배포 옆 **⋯ 메뉴**
   - **Redeploy** 클릭

---

### Step 4: 확인

#### 로컬에서 확인
```bash
npm run dev
```

브라우저 콘솔(F12):
```
✅ [TTS] API Key exists: true
✅ [TTS] API Key length: 39
✅ [TTS] Google TTS API 호출 성공
✅ [useTTS] TTS API 응답 성공
```

#### 서버에서 확인

배포 후 브라우저 콘솔(F12):
```
# 정상:
✅ [TTS] API Key exists: true
✅ [TTS] Google TTS API 호출 성공

# 오류 (환경 변수 미설정):
❌ [TTS] API Key exists: false
❌ [TTS] GOOGLE_CLOUD_TTS_API_KEY is not configured
⚠️ [useTTS] 브라우저 기본 TTS로 폴백
```

---

## 🎯 테스트

### 원어민 발음 확인
1. 학습 화면에서 단어 카드 표시
2. 🔊 발음 버튼 클릭
3. **원어민 발음**으로 재생되어야 함

### 한국식 발음 (폴백)
- API 키 없으면 자동으로 브라우저 기본 TTS 사용
- 기능은 작동하지만 발음 품질 낮음

---

## 💰 비용

### 무료 할당량
- **월 100만 글자**
- 단어 + 예문 평균 100글자 = **1만회 발음 가능**

### 예상 비용
- 학생 100명, 월 10,000단어 학습
- 100명 × 10,000 × 100글자 = 1억 글자
- 초과분: 9,900만 글자
- 비용: $16 × 99 = **약 $1,584/월**

### 비용 절감 방법
1. **캐싱:** 같은 단어는 재사용
2. **제한:** 1일 발음 횟수 제한
3. **Standard 음성 사용:** Wavenet 대신 Standard ($4/100만 글자)

---

## 🔧 트러블슈팅

### "API key not configured" 에러

**원인:** 환경 변수 누락

**해결:**
1. Vercel → Settings → Environment Variables 확인
2. `GOOGLE_CLOUD_TTS_API_KEY` 추가
3. Redeploy

---

### "Permission denied" 에러

**원인:** API 미활성화 또는 Billing 미설정

**해결:**
1. Google Cloud Console → APIs & Services → Library
2. "Cloud Text-to-Speech API" 활성화 확인
3. Billing 계정 연결 확인

---

### 여전히 한국식 발음

**확인:**
1. 브라우저 콘솔(F12) 로그 확인
2. `❌ [TTS]` 로그가 있으면 에러 발생 중
3. Vercel → Deployments → Functions 로그 확인

---

## 📝 체크리스트

배포 전:
- [ ] Google Cloud TTS API 활성화
- [ ] Billing 계정 연결
- [ ] API Key 생성
- [ ] API Key 제한 설정 (Cloud Text-to-Speech API)
- [ ] `.env.local`에 API Key 추가 (로컬)
- [ ] Vercel 환경 변수에 API Key 추가 (배포)
- [ ] Redeploy
- [ ] 브라우저 콘솔 로그 확인
- [ ] 발음 테스트

---

**완료 후:** 원어민 발음으로 정상 작동! 🎉

