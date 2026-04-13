# Tenex Reports 문서 생명주기 기준

테넥스 리포트 문서는 앞으로 아래 4가지 상태로만 관리한다.

## 1. 상태 정의

### LIVE
지금 실제로 사용하는 대표 문서.

조건:
- 메인 메뉴에 노출된다.
- 현재 의사결정/실행에 사용된다.
- 같은 주제에서 대표본은 1개만 둔다.
- team 계정까지 보여도 되는 문서만 포함한다.

예시:
- 현재 전략 문서
- 현재 CRM 문서
- 현재 제품 로드맵
- 현재 팀 구조 문서

### ARCHIVE
과거 기록이지만 보관 가치가 있는 문서.

조건:
- 최신 대표본은 아니다.
- 기록, 복기, 레퍼런스 용도로 남긴다.
- 메인 메뉴에는 노출하지 않는다.
- archive 섹션 또는 archive 경로에서만 본다.

예시:
- 주간 리포트 구버전
- 과거 회의록
- 이전 버전 분석 문서
- 교육/참고 자료

### INTERNAL
현재 살아 있지만 민감해서 제한해야 하는 문서.

조건:
- 재무, 지분, 채용 처우, 보안, 시스템 내부 구조, 대표 전용 메모가 포함된다.
- admin only로 제한한다.
- 메인 메뉴에는 team 기준으로 노출하지 않는다.

예시:
- funding
- profit-simulation
- security-dashboard
- openclaw 관련 내부 문서
- admin용 팀 구조 문서

### DRAFT
미완성 초안 또는 검토 전 문서.

조건:
- 실사용 전이다.
- 팀 공유 전이다.
- 메인 메뉴에 노출하지 않는다.
- draft 상태를 벗어난 후 LIVE/ARCHIVE/INTERNAL로 승격한다.

---

## 2. 핵심 원칙

1. 메인 메뉴에는 LIVE만 올린다.
2. 같은 주제의 대표본은 1개만 LIVE로 둔다.
3. 날짜가 들어간 문서는 기본적으로 ARCHIVE 후보로 본다.
4. 민감 정보가 하나라도 들어가면 INTERNAL로 본다.
5. 숨겨진 문서는 정리 완료가 아니다. 상태를 명시해야 한다.

---

## 3. 현재 1차 분류 기준

### LIVE
- tenex-strategy.html
- 2026-team-structure.html
- crm.html
- product-roadmap.html
- brand-design-system.html
- kinemedical-redesign.html
- media-mix-strategy.html
- mixpanel-analysis.html
- customer-journey-v5.html
- youtube.html
- sns-tracker.html
- ai-usage-guide.html
- onboarding-guide.html
- onboarding-guide-v2.html
- cs-guide-external.html
- cs-optimization-plan.html
- faq.html
- global-strategy.html
- membership.html
- apr-analysis.html
- apr-hiring-analysis.html
- apr-organization-analysis.html
- ceo-roles.html
- es808.html
- es808-unboxing-plan.html
- myprotein-growth.html
- platform-api-research.html
- team-board.html

### ARCHIVE
- mosamo-lectures.html
- jasagyo-5gi.html
- jasagyo-6ki-week2.html
- jasagyo-6-5.html
- meta-weekly-2026-03-30.html
- weekly-mixpanel-2026-04-05.html
- weekly-mixpanel-2026-04-12.html
- archive/*

### INTERNAL
- funding.html
- profit-simulation.html
- 2026-team-structure-admin.html
- project-status.html
- agent-team-plan.html
- ai-system.html
- openclaw-overview.html
- system-status.html
- openclaw-troubleshooting.html
- security-dashboard.html
- skills-dashboard.html
- cron-dashboard.html
- deploy-dashboard.html
- heartbeat-dashboard.html
- tenex-os-plan.html
- kinemedical-app.html
- app-tech-spec.html
- app-unified.html
- 1min-dosu-app.html
- admin.html

### DRAFT
- app-journey-plan.html
- dart-marketing-cost.html
- tenex-culture.html
- careers*.html 계열 중 채용사이트 초안/준비 문서
- 아직 최신 대표본이 아닌 실험성 문서

---

## 4. 운영 규칙

### 새 문서 생성 시
1. LIVE / ARCHIVE / INTERNAL / DRAFT 중 하나를 먼저 정한다.
2. LIVE가 아니면 메인 메뉴에 올리지 않는다.
3. 같은 주제의 LIVE 문서가 이미 있으면 새 문서는 LIVE로 두지 않는다.

### 문서 수정 시
1. 기존 LIVE를 덮어쓸지
2. 새 버전으로 교체하고 기존 문서를 ARCHIVE로 보낼지
3. 민감 정보가 생겨 INTERNAL로 전환할지
를 먼저 판단한다.

### 날짜형 문서
- 기본은 ARCHIVE
- 당주 핵심판만 임시 LIVE 가능
- 다음 대표판이 생기면 ARCHIVE로 내린다.

---

## 5. 메뉴 정책

- index 메인 메뉴 = LIVE만
- archive는 별도 섹션 또는 별도 경로
- internal은 admin에서만 보임
- draft는 메뉴 비노출

---

## 6. 다음 정리 작업 우선순위

1. 현재 문서별 상태를 실제 파일 기준으로 확정
2. LIVE만 메인 메뉴 노출 유지
3. ARCHIVE 대상 문서 별도 섹션/경로 분리
4. DRAFT 문서 목록 별도 관리
5. INTERNAL 문서명과 admin-only 규칙 점검
