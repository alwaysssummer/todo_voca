# Todo Voca - 설치 및 설정 가이드

## ✅ Day 1-2 완료 항목

다음 항목들이 성공적으로 완료되었습니다:
- ✅ Next.js 15 프로젝트 생성 (TypeScript + Tailwind CSS)
- ✅ Shadcn UI 설치 및 기본 컴포넌트 생성
- ✅ Supabase 클라이언트 설정
- ✅ 데이터베이스 스키마 정의 (SQL)
- ✅ 학생 라우팅 (`/s/[token]`) 구현
- ✅ 기본 프로젝트 구조 생성

## 🚀 다음 단계

### 1. Supabase 프로젝트 생성 (필수)

1. [Supabase](https://supabase.com) 접속 및 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. Region 선택 (Seoul 권장)
5. 프로젝트 생성 완료 대기

### 2. 데이터베이스 스키마 실행

1. Supabase Dashboard → SQL Editor 이동
2. `lib/supabase/database.sql` 파일의 내용 전체 복사
3. SQL Editor에 붙여넣기
4. "Run" 버튼 클릭하여 실행
5. 성공 메시지 확인

### 3. 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```env
# Supabase 프로젝트 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 기본 URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Supabase 정보 찾기:**
1. Supabase Dashboard → Settings → API
2. Project URL 복사 → `NEXT_PUBLIC_SUPABASE_URL`에 입력
3. `anon` `public` 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📁 현재 프로젝트 구조

```
todo-voca/
├── app/
│   ├── globals.css              ✅ Tailwind 스타일
│   ├── layout.tsx               ✅ 루트 레이아웃
│   ├── page.tsx                 ✅ 홈페이지
│   ├── s/[token]/
│   │   └── page.tsx            ✅ 학생 학습 화면 (기본)
│   └── teacher/
│       └── login/
│           └── page.tsx        ✅ 강사 로그인 (UI만)
├── components/
│   ├── ui/                      ✅ Shadcn UI 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   └── scroll-area.tsx
│   └── student/
│       └── study-screen.tsx    ✅ 학습 화면 컴포넌트 (기본)
├── lib/
│   ├── supabase.ts             ✅ Supabase 클라이언트
│   ├── utils.ts                ✅ 유틸리티 함수
│   └── supabase/
│       └── database.sql        ✅ DB 스키마
├── types/
│   ├── word.ts                 ✅ 단어 타입
│   ├── progress.ts             ✅ 진도 타입
│   └── test.ts                 ✅ 평가 타입
├── docs/
│   ├── 0_마스터플랜.md
│   └── 1_상세개발플랜.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 🎯 Day 3-4 예정 작업

다음 단계에서는 학습 화면을 완성합니다:
- 학생 학습 페이지 완성
- 헤더 컴포넌트 개선
- 현재 단어 영역 완성
- [안다]/[모른다] 버튼 동작 구현
- 완료 단어 목록 실시간 업데이트

## 🔍 테스트 방법

### 1. 홈페이지 확인
```
http://localhost:3000
```
"Todo Voca" 홈페이지가 표시되어야 합니다.

### 2. 강사 로그인 페이지 확인
```
http://localhost:3000/teacher/login
```
로그인 폼이 표시되어야 합니다 (아직 기능 없음).

### 3. 학생 학습 페이지 확인
```
http://localhost:3000/s/any-token-here
```
학생 학습 화면 기본 UI가 표시되어야 합니다.
(Supabase 연동 전이므로 "학생을 찾을 수 없습니다" 메시지가 정상입니다)

## ⚠️ 알려진 이슈

1. **학생 학습 화면이 작동하지 않음**
   - 정상입니다. Supabase 데이터베이스에 학생 데이터가 없기 때문입니다.
   - Day 3-4에서 샘플 데이터를 추가할 예정입니다.

2. **강사 로그인이 작동하지 않음**
   - 정상입니다. 로그인 기능은 Day 10-11에 구현 예정입니다.

## 📝 다음 명령어

다음 작업을 시작하려면:
```
"Day 3-4 학습 화면 개발 시작해줘"
```

또는 특정 기능부터:
```
"Skip 모달 먼저 만들어줘"
```

---

**현재 진행률: Phase 1 Week 1 Day 1-2 완료 (전체 5%)**

