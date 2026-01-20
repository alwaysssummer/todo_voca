# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Todo Voca**는 학원용 단어 암기 관리 플랫폼입니다. 학생들이 URL 기반으로 접속하여 단어를 학습하고, 강사가 진도를 모니터링할 수 있습니다.

## 개발 명령어

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
npm run start    # 프로덕션 서버 시작
```

## 기술 스택

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI**: Shadcn UI (Radix UI 기반), Lucide React 아이콘
- **Backend**: Supabase (PostgreSQL, RLS 활성화)
- **상태 관리**: React Hooks (커스텀 훅 패턴)
- **기타**: dnd-kit (드래그 앤 드롭), papaparse (CSV 파싱)

## 아키텍처 핵심 개념

### 1. 사용자 흐름
- **학생**: `/s/[token]/...` 경로로 접속 (access_token 기반, 비밀번호 불필요)
- **강사**: `/teacher/login` → `/teacher/dashboard`

### 2. 학습 시스템 (세션 기반)
학습은 "회차(session)" 단위로 진행됩니다:
- `session_goal`: 회차당 목표 단어 수 (기본 20개)
- `current_session`: 현재 회차 번호 (DB `student_wordlists.current_session`에서 관리)
- 회차 완료 시 `completed_wordlists` 테이블에 기록 생성
- "모른다" 표시한 단어는 다음 회차에 재등장

### 3. 평가 시스템
- **O-TEST**: 아는 단어(completed) 평가 (30% 샘플링)
- **X-TEST**: 모르는 단어(skipped) 평가 (100% 출제)
- 결과는 `online_tests` 테이블에 `test_type` 구분하여 저장

### 4. 복습 단어장 자동 생성
단어장 완료 시 skip된 단어들로 새로운 복습 단어장이 자동 생성됩니다.
- `createReviewWordlist()` 함수 (`hooks/useStudySession.ts`)
- 중복 생성 방지: 이름 기반 체크 + `isGeneratingReviewRef` 플래그

## 주요 커스텀 훅

| 훅 | 위치 | 역할 |
|---|---|---|
| `useStudySession` | `hooks/useStudySession.ts` | 학습 화면 핵심 로직 (단어 진행, 진도 계산, 복습 생성) |
| `useStudentDashboard` | `hooks/useStudentDashboard.ts` | 학생 대시보드 데이터 로드 |
| `useOnlineTest` | `hooks/useOnlineTest.ts` | 온라인 평가 문제 생성 및 채점 |
| `useTTS` | `hooks/useTTS.ts` | 텍스트 음성 변환 |

## 데이터베이스 구조

핵심 테이블 관계:
```
users (강사/학생)
  ↓
student_wordlists (배정) ─→ wordlists (단어장 마스터)
  ↓                              ↓
completed_wordlists (회차 완료) ← words (단어)
  ↓
online_tests (평가 결과)
```

### 중요 컬럼
- `student_wordlists.current_session`: 현재 회차 번호
- `student_wordlists.filtered_word_ids`: 복습 단어장에서 특정 단어만 포함할 때 사용
- `completed_wordlists.word_ids`: 안다(O) 단어 ID 배열
- `completed_wordlists.unknown_word_ids`: 모른다(X) 단어 ID 배열

### Supabase RPC 함수
- `get_next_word`: 다음 학습할 단어 조회 (회차 기반 로직)

SQL 마이그레이션 파일: `lib/supabase/*.sql`

## 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_API_KEY=...  # 선택: Google Sheets 연동
```

## 코드 컨벤션

- 경로 별칭: `@/*` → 프로젝트 루트
- 타입 정의: `types/database.ts`에 중앙 관리
- UI 컴포넌트: `components/ui/` (Shadcn UI)
- 도메인 컴포넌트: `components/student/`, `components/teacher/`

## 디버깅 팁

- 콘솔 로그에 이모지 prefix 사용 (🔵 fetchNextWord, 🟢 handleKnow 등)
- 진도 계산 이슈: `calculateProgress()` 함수와 DB `current_session` 값 확인
- 회차 완료 판정: `isSessionComplete()` 함수 확인
