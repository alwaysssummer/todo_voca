# Todo Voca - 체크리스트 단어장

단어 암기를 할 일(To-Do) 프로젝트로 관리하는 웹 기반 학원 관리 플랫폼

## 🌐 데모

- **프로덕션**: [https://your-app.vercel.app](https://your-app.vercel.app) *(배포 후 업데이트)*
- **강사 로그인**: `teacher` / `7136`
- **학생 접속**: 강사가 제공한 개별 링크 사용

## 🚀 기술 스택

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Library**: Shadcn UI
- **Backend**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📦 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key  # 선택: 단어장 추가 기능용
```

> 📝 자세한 환경 변수 설정 가이드는 [ENV_TEMPLATE.md](./ENV_TEMPLATE.md) 참고

### 3. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `lib/supabase/database.sql` 파일의 내용을 실행
3. 환경 변수에 URL과 API Key 입력

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📁 프로젝트 구조

```
todo-voca/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # 홈페이지
│   ├── s/[token]/               # 학생 학습 화면
│   └── teacher/                 # 강사 관리 화면
├── components/                   # React 컴포넌트
│   ├── ui/                      # Shadcn UI 컴포넌트
│   └── student/                 # 학생 화면 컴포넌트
├── lib/                         # 유틸리티 및 설정
│   ├── supabase.ts             # Supabase 클라이언트
│   └── utils.ts                # 유틸리티 함수
├── types/                       # TypeScript 타입 정의
└── docs/                        # 개발 문서
```

## 🎯 주요 기능

### 학생 기능
- ✅ URL 기반 즉시 접속 (비밀번호 불필요)
- ✅ 단어 학습 (안다/모른다)
- ✅ Skip 모달 (1-2회, 3-4회, 5회+)
- ✅ 일일 목표 달성 및 세션 관리
- ✅ 온라인 자동 평가 (객관식)
- ✅ 세대별 학습 시스템 (1차 → 2차 단어장)

### 강사 기능
- ✅ 학생 관리 (추가, 링크 공유)
- ✅ 단어장 배정 (Google Sheets 연동)
- ✅ 진도 모니터링 (실시간)
- ✅ 학생별 상세 진도 확인
- ✅ 온라인 평가 결과 확인
- ✅ 단어장 보기 (바로가기 기능)

## 📖 개발 가이드

자세한 개발 가이드는 다음 문서를 참고하세요:
- `docs/0_마스터플랜.md` - 전체 기획서
- `docs/1_상세개발플랜.md` - 화면별 상세 개발 가이드

## 🚀 배포 가이드

Vercel 배포 방법은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

### 빠른 배포 (5단계)

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com)에서 저장소 연결
3. 환경 변수 설정 (Supabase URL, API Key)
4. Deploy 클릭
5. 배포 완료!

## 🔄 개발 진행 상황

**Phase 1 MVP 완료! (2주)** 🎉

- ✅ Next.js 15 프로젝트 구조
- ✅ Shadcn UI 통합
- ✅ Supabase 연동 및 RLS
- ✅ 학생 학습 화면 (세션별 관리)
- ✅ Skip 모달 시스템
- ✅ 온라인 평가 시스템
- ✅ 강사 대시보드
- ✅ 학생 관리 및 진도 모니터링
- ✅ 단어장 관리 (Google Sheets 연동)
- ✅ 세대별 학습 시스템

## 📝 라이선스

Private Project

## 👥 개발자

[Your Name] - 2025

