# Tenex Reports

테넥스 내부 보고서 + 업무보드 시스템. Vercel + Supabase.

## 아키텍처

```
[프론트엔드 (SPA)]
   ├── src/index.html       — 메인 대시보드 (보고서 + 업무보드 + 간트차트)
   ├── src/project-status.html — 실장별 현황 보드
   ├── src/admin.html        — 계정 관리
   └── src/security-dashboard.html — 보안 대시보드
         │
         ▼
[Vercel Serverless API]
   ├── api/tasks/read.ts     — GET  tasks + agents (공개)
   ├── api/tasks/update.ts   — POST tasks + agents (admin JWT 필요)
   ├── api/tasks/delete.ts   — DELETE task/agent (admin JWT 필요)
   ├── api/auth/login.ts     — POST 로그인 → JWT 쿠키
   ├── api/auth/logout.ts    — POST 로그아웃
   └── api/admin/users.ts    — GET/POST/PUT/PATCH/DELETE 계정 관리
         │
         ▼
[Supabase (PostgreSQL)]
   ├── tasks 테이블     — 업무 카드 (22+ rows)
   └── agents 테이블    — 실장별 업무 (4 rows)
```

## DB 스키마

### tasks
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 태스크 ID (t01, t02, ...) |
| title | TEXT | 제목 |
| cat | TEXT | 카테고리 (A~K) |
| urgency | TEXT | 긴급도 (red/yellow/green) |
| importance | TEXT | 중요도 (상/중/하) |
| status | TEXT | 상태 (waiting/doing/done/delay) |
| assignee | TEXT | 담당자 |
| due_date | TEXT | 마감일 |
| note | TEXT | 설명 |
| checklist | JSONB | 체크리스트 [{text, done}] |
| sort_order | INT | 카테고리 내 정렬 |
| priority_order | INT | 우선순위 리스트 정렬 |
| updated_at | TIMESTAMPTZ | 최종 수정일 |

### agents
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 실장 ID (개실장, 마실장, ...) |
| icon | TEXT | 아이콘 이모지 |
| name | TEXT | 이름 |
| role | TEXT | 역할 |
| tasks | JSONB | 실장별 업무 [{id, name, status}] |
| updated_at | TIMESTAMPTZ | 최종 수정일 |

## API 엔드포인트

| Method | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/tasks/read` | 불필요 | 전체 tasks + agents 조회 |
| POST | `/api/tasks/update` | admin JWT | tasks + agents upsert |
| DELETE | `/api/tasks/delete?id=&table=` | admin JWT | 단일 삭제 |
| POST | `/api/auth/login` | - | 로그인 → JWT 쿠키 발급 |
| POST | `/api/auth/logout` | - | 로그아웃 |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/users` | admin JWT | 계정 CRUD |

## 환경변수 (Vercel)

| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase anon key (읽기용) |
| `SUPABASE_SERVICE_KEY` | Supabase service key (쓰기용) |
| `JWT_SECRET` | JWT 서명 시크릿 |
| `USERS` | 계정 목록 (형식: `username:bcryptHash:role:path1\|path2,...`) |

## 데이터 흐름

1. **읽기**: 프론트 → `GET /api/tasks/read` → Supabase → JSON 응답
2. **쓰기**: 프론트 → `POST /api/tasks/update` (JWT 필요) → Supabase upsert
3. **폴백**: DB 실패 시 localStorage 사용 (에러 토스트 표시)
4. **동기화**: 변경 시 500ms 디바운스 → API 전송 (실패 시 2회 재시도)

## 로컬 개발

```bash
npm install
npx vercel dev
```

## 배포

```bash
git push  # main → Vercel 자동 배포
```

## 문서 운영 기준

리포트 문서는 `LIVE / ARCHIVE / INTERNAL / DRAFT` 4가지 상태로만 관리한다.

- 메인 메뉴에는 `LIVE`만 노출
- `ARCHIVE`는 기록 보관용
- `INTERNAL`은 admin only
- `DRAFT`는 메뉴 비노출

상세 기준은 `DOC_LIFECYCLE.md` 참고.
