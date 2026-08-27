# 날짜메모

날짜별로 할 일과 메모를 남기는 캘린더 웹앱입니다. **비밀번호 한 개**만 입력하면 들어갈 수 있고, PC(넓은 화면)에서는 사이드 내비게이션이 있는 웹앱 레이아웃으로, 모바일 화면에서는 하단 탭바가 있는 반응형 레이아웃으로 자동 전환됩니다.

- 주간 날짜 스트립(월~일)에서 날짜를 선택
- 선택한 날짜에 시간이 찍힌 메모/할 일 카드를 추가·완료 표시·삭제
- 메모가 있는 날짜는 점(●)으로 표시
- **이미지** 탭에서 사진을 업로드하고 그리드로 모아보기(클릭하면 크게 보기 + 삭제)
- 메모에 6가지 색상 중 하나로 **카테고리** 태그를 붙일 수 있음(추가·수정 시 색상 원 클릭), 색상 칩으로 그 날짜의 메모를 필터링해서 보기
- 별도 **카테고리** 탭에서 색상 하나를 고르면 날짜에 상관없이 그 카테고리의 메모를 전부 모아보기(수정·삭제·답장 가능)
- 캘린더 화면 상단 **메모 / 일기** 탭 전환 — **일기**에서는 날짜별로 길게 글을 쓰고 사진도 삽입할 수 있음(입력 멈추면 자동 저장)
- 아이폰 **단축어(Shortcuts)** 위젯으로 오늘의 메모를 홈 화면에 띄우기 (아래 "단축어 위젯" 참고)
- 비밀번호 없이는 어떤 화면·API도 볼 수 없음(미들웨어에서 매 요청마다 검사, 단축어 위젯 API는 예외로 별도 토큰 사용)

## 기본 비밀번호

**`0000`** — 별도 설정 없이 바로 사용할 수 있도록 기본값으로 넣어뒀습니다. 바꾸고 싶으면 `.env.local`에 `APP_PASSWORD=원하는비밀번호` 한 줄만 추가하면 됩니다. (선택사항이며, 안 해도 됩니다.)

## 기술 스택

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- 비밀번호 로그인: 서명된 쿠키 1개(계정/DB 세션 없음)
- 데이터 저장: 로컬에서는 `data/todos.json`(메모) / `data/diary.json`(일기) 파일, Vercel에 Redis(Upstash) 스토리지를 연결하면 자동으로 그쪽에 저장 (아래 "배포하기" 참고)
- 이미지 저장: 로컬에서는 `data/images/` 폴더, Vercel에 Blob 스토리지를 연결하면 자동으로 그쪽에 저장 (아래 "배포하기" 참고)

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
4. 이미지 업로드도 남기고 싶다면 같은 **Storage** 탭에서 **Create Database** → **Blob** 선택 → 만들기 → **Connect to Project**
5. 프로젝트를 한 번 **Redeploy** (환경변수가 추가됐으니 새로 반영되도록)

이 단계까지 하면 메모는 Redis에, 이미지는 Blob에 저장되어 재배포·시간 경과와 무관하게 안전하게 남습니다. 건너뛰면 앱은 정상 동작하지만 메모/이미지는 로컬 파일에 저장을 시도하다 서버리스 환경 특성상 사라질 수 있습니다.

비밀번호를 바꾸고 싶으면 프로젝트 환경변수에 `APP_PASSWORD`만 추가하면 됩니다(선택, 안 해도 `0000`으로 동작).

## 아이폰 단축어(Shortcuts) 위젯

로그인 쿠키 없이도 오늘의 메모만 읽을 수 있는 별도 API(`/api/widget`)를 통해, 홈 화면 위젯으로 오늘의 메모를 띄울 수 있습니다.

**1. 위젯 토큰 설정**

Vercel 프로젝트 → **Settings → Environment Variables** → `WIDGET_TOKEN` 추가 (랜덤 문자열, 예: `openssl rand -hex 16` 결과) → **Redeploy**. 설정 전에는 이 API가 501로 막혀 있습니다.

**2. 아이폰 "단축어" 앱에서 새 단축어 만들기**

아래 순서로 액션을 추가하세요.

1. **현재 날짜**
2. **날짜 서식 지정** — 형식: "사용자 지정", `yyyy-MM-dd`
3. **텍스트** — 아래 내용을 입력하고, 맨 끝에 2번 결과(서식 지정된 날짜)를 붙여넣기
   ```
   https://dailysentences.vercel.app/api/widget?token=여기에_WIDGET_TOKEN&date=
   ```
4. **URL의 콘텐츠 가져오기** — URL: 3번의 텍스트 결과

이렇게 만든 단축어를 실행하면 오늘 메모가 다음과 같은 텍스트로 반환됩니다.

```
8월 26일 (수)

🔴 09:15 알뜰폰 투폰 가능한지
· 10:36 오오된다
```

**3. 홈 화면 위젯으로 추가**

홈 화면 빈 곳 길게 누르기 → **+** → **단축어** 검색 → 위젯 크기 선택 → 방금 만든 단축어 지정.

> iOS 위젯은 시스템이 정한 주기(보통 수십 분 간격)로만 자동 새로고침됩니다 — 앱에서 더 자주 갱신하도록 강제할 수 없는 iOS 자체 제약입니다. 위젯을 탭하면 즉시 최신 내용으로 실행됩니다.

`/api/widget?token=...&format=json`으로 요청하면 `{ date, items: [{ time, text, done, categoryColor, categoryName }] }` 형태의 JSON도 받을 수 있어, 더 꾸민 위젯을 만들고 싶다면 이 형식을 활용하세요.

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
    calendar/          # 캘린더 화면
    category/           # 카테고리별 메모 모아보기 화면
    image/                # 이미지 업로드/갤러리 화면
    api/login/           # 비밀번호 확인 + 로그인 쿠키 발급
    api/logout/           # 로그인 쿠키 삭제
    api/todos/              # 메모 CRUD API
    api/images/              # 이미지 업로드/목록/삭제 API
    api/diary/                # 일기 조회/저장 API
    api/widget/                 # 단축어 위젯용 토큰 인증 조회 API
  components/            # AppShell, CalendarApp, CategoryBrowser, DiaryEditor, ImageGallery, WeekStrip, TodoItem, AddTodoSheet, NavRail 등
  lib/
    auth-cookie.ts          # 비밀번호 확인 + 쿠키 서명/검증
    store.ts                 # 메모 저장 (Redis 연결돼 있으면 Redis, 아니면 data/todos.json)
    image-store.ts             # 이미지 저장 (Blob 연결돼 있으면 Blob, 아니면 data/images/)
    diary-store.ts               # 일기 저장 (Redis 연결돼 있으면 Redis, 아니면 data/diary.json)
    categories.ts                  # 카테고리 색상 팔레트
    date.ts                          # 날짜 유틸리티
  proxy.ts                      # 모든 요청에서 로그인 쿠키를 검사하는 미들웨어
data/todos.json                  # 실제 메모 데이터 (git에는 포함되지 않음, 실행 시 자동 생성)
data/diary.json                  # 실제 일기 데이터 (git에는 포함되지 않음, 실행 시 자동 생성)
data/images/                     # 실제 이미지 파일 (git에는 포함되지 않음, 실행 시 자동 생성)
```
