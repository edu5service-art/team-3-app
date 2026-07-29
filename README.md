# 미니 캐치테이블 (Mini CatchTable)

실시간 원격 웨이팅 및 당일 시간대별 예약 슬롯 관리 플랫폼. 회원가입/로그인 없이 비회원 전용으로 동작합니다.

## 구성

- Next.js (App Router) + Tailwind CSS
- Supabase (PostgreSQL + Realtime)

## 페이지

- `/` — 고객 화면: 오늘의 시간대별 예약 슬롯 조회/예약, 실시간 웨이팅 신청
- `/owner` — 점주 대시보드: 예약 슬롯 현황, 웨이팅 대기열 관리 (호출/입장완료/취소)

## 시작하기

1. `supabase/schema.sql`을 Supabase SQL Editor에서 실행 (테이블 생성 + RLS 정책 + Realtime 등록 + 데모 매장/슬롯 시드)
2. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
3. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.
