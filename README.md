# Todo Voca - 체크리스트 단어장

단어 암기를 할 일(To-Do) 프로젝트로 관리하는 웹 기반 학원 관리 플랫폼

## 🚀 기술 스택

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Library**: Shadcn UI
- **Backend**: Supabase (PostgreSQL)
- **Icons**: Lucide React

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
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

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
- ⏳ Skip 모달 (1-2회, 3-4회, 5회+)
- ⏳ 일일 목표 달성
- ⏳ 온라인 자동 평가

### 강사 기능
- ⏳ 학생 관리
- ⏳ 단어장 배정
- ⏳ 진도 모니터링
- ⏳ Skip 통계
- ⏳ 온라인 평가 분석

## 📖 개발 가이드

자세한 개발 가이드는 다음 문서를 참고하세요:
- `docs/0_마스터플랜.md` - 전체 기획서
- `docs/1_상세개발플랜.md` - 화면별 상세 개발 가이드

## 🔄 개발 진행 상황

현재 Phase 1 Week 1 진행 중

- ✅ Next.js 프로젝트 생성
- ✅ Shadcn UI 설치
- ✅ Supabase 연동 설정
- ✅ 기본 라우팅 구조
- ⏳ 학습 화면 완성
- ⏳ Skip 모달 구현

## 📝 라이선스

Private Project

## 👥 개발자

개발 중...

