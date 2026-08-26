# 날짜메모

날짜별로 할 일과 메모를 남기는 캘린더 웹앱입니다. **비밀번호 한 개**만 입력하면 들어갈 수 있고, PC(넓은 화면)에서는 사이드 내비게이션이 있는 웹앱 레이아웃으로, 모바일 화면에서는 하단 탭바가 있는 반응형 레이아웃으로 자동 전환됩니다.

- 주간 날짜 스트립(월~일)에서 날짜를 선택
- 선택한 날짜에 시간이 찍힌 메모/할 일 카드를 추가·완료 표시·삭제
- 메모가 있는 날짜는 점(●)으로 표시
- 비밀번호 없이는 어떤 화면·API도 볼 수 없음(미들웨어에서 매 요청마다 검사)

## 기본 비밀번호

**`0000`** — 별도 설정 없이 바로 사용할 수 있도록 기본값으로 넣어뒀습니다. 바꾸고 싶으면 `.env.local`에 `APP_PASSWORD=원하는비밀번호` 한 줄만 추가하면 됩니다. (선택사항이며, 안 해도 됩니다.)

## 기술 스택

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- 비밀번호 로그인: 서명된 쿠키 1개(계정/DB 세션 없음)
- 데이터 저장: 로컬에서는 `data/todos.json` 파일, Vercel에 Redis(Upstash) 스토리지를 연결하면 자동으로 그쪽에 저장 (아래 "배포하기" 참고)

## 로컬에서 실행하기

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 → 비밀번호(`0000`) 입력 → `/calendar`로 이동. 이게 전부입니다.

## 배포하기 (Vercel, 메모 데이터 안전하게 보존)

1. GitHub 저장소를 Vercel에서 Import (또는 아래 원클릭 배포 버튼)
   - **[Deploy to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnainn-a%2Fdailysentences)**
   - 환경변수는 아무것도 안 넣어도 배포됩니다 (기본 비밀번호 `0000` 적용).
2. 배포가 끝나면 프로젝트 대시보드 → **Storage** 탭 → **Create Database** → **Redis** 선택 → 만들기
3. 만든 Redis를 **Connect to Project**로 이 프로젝트에 연결 (env var가 자동으로 추가됨, 직접 입력할 값 없음)
4. 프로젝트를 한 번 **Redeploy** (환경변수가 추가됐으니 새로 반영되도록)

이 단계까지 하면 메모가 Redis에 저장되어 재배포·시간 경과와 무관하게 안전하게 남습니다. 2~4단계를 건너뛰면 앱은 정상 동작하지만 메모는 로컬 파일에 저장을 시도하다 서버리스 환경 특성상 사라질 수 있습니다.

비밀번호를 바꾸고 싶으면 프로젝트 환경변수에 `APP_PASSWORD`만 추가하면 됩니다(선택, 안 해도 `0000`으로 동작).

### 그 외 호스트 (Render, 개인 서버 등)

Node.js가 상시 실행되는 곳(서버리스가 아닌 VM/컨테이너)이라면 Redis 없이 로컬 파일 저장만으로도 재배포와 무관하게 데이터가 유지됩니다.

```bash
npm install
npm run build
npm run start
```

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |

## 프로젝트 구조

```
src/
  app/
    login/            # 비밀번호 입력 화면
    calendar/          # 메인 화면
    api/login/           # 비밀번호 확인 + 로그인 쿠키 발급
    api/logout/           # 로그인 쿠키 삭제
    api/todos/              # 메모 CRUD API
  components/            # CalendarApp, WeekStrip, TodoItem, AddTodoSheet, NavRail 등
  lib/
    auth-cookie.ts          # 비밀번호 확인 + 쿠키 서명/검증
    store.ts                 # 메모 저장 (Redis 연결돼 있으면 Redis, 아니면 data/todos.json)
    date.ts                    # 날짜 유틸리티
  proxy.ts                      # 모든 요청에서 로그인 쿠키를 검사하는 미들웨어
data/todos.json                  # 실제 메모 데이터 (git에는 포함되지 않음, 실행 시 자동 생성)
```
