# 올해의 나 시상식

친구들이 링크로 들어와 주인공에게 상을 골라 주고, 2026-12-31 21:00(KST)에 결과가 공개되는 모바일 웹이에요.
작업 기준은 [CLAUDE.md](./CLAUDE.md)를 봐 주세요.

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm test` | 단위 테스트(vitest) |

- 연결 확인: `GET /api/health` → `{"ok":true}`
- UI 견본(개발 전용): `/dev/ui`
- Firestore 보안 규칙 배포: `firebase deploy --only firestore:rules`
- Firestore TTL 정책 배포(`rateLimits.expireAt` 자동 삭제): `firebase deploy --only firestore:indexes` (Firebase Blaze 요금제 필요)

## API 써 보기

아래 예시는 개발 서버(`http://localhost:3000`) 기준이에요. 배포 주소로 바꿔서 써도 돼요.
만들기 요청은 Firestore에 실제 시상식 문서를 만들어요.

### 맥 / 리눅스 (bash, zsh)

시상식 만들기:

```bash
curl -i -X POST http://localhost:3000/api/ceremonies \
  -H 'Content-Type: application/json' \
  -d '{"name":"지민"}'
```

성공하면 `201`과 함께 아래처럼 와요. `manageUrl`의 `#` 뒤가 관리 토큰이고, 이 응답에서 한 번만 볼 수 있어요.

```json
{ "slug": "k7m3p9xq", "manageUrl": "http://localhost:3000/m/k7m3p9xq#..." }
```

조회하기(`<slug>` 자리에 받은 slug):

```bash
curl -i http://localhost:3000/api/ceremonies/<slug>
```

```json
{ "name": "지민", "revealAt": "2026-12-31T12:00:00.000Z", "trophyCount": 0, "closed": false }
```

slug만 바로 꺼내 쓰려면(jq 필요):

```bash
SLUG=$(curl -s -X POST http://localhost:3000/api/ceremonies \
  -H 'Content-Type: application/json' -d '{"name":"지민"}' | jq -r .slug)
curl -s http://localhost:3000/api/ceremonies/$SLUG
```

### 윈도우 (PowerShell)

PowerShell 5.1에서 `curl`은 `Invoke-WebRequest`의 별칭이라 위 명령이 그대로 동작하지 않아요. `Invoke-RestMethod`를 쓰세요.
한글 이름이 깨지지 않게 body를 UTF-8 바이트로 보내요.

시상식 만들기:

```powershell
$body = @{ name = "지민" } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/ceremonies" `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
$res
```

조회하기:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/ceremonies/$($res.slug)"
```

`Invoke-RestMethod`는 4xx·5xx 응답에서 예외를 던져요. 에러 body(`{ error, message }`)를 보려면 PowerShell 7 이상에서 `-SkipHttpErrorCheck`를 붙이세요.

### 상 주기 (친구 화면)

같은 친구는 한 시상식에 한 번만 상을 줄 수 있어요. 친구는 `voterId` 쿠키로 구분해요.
첫 요청 응답의 `Set-Cookie`로 쿠키를 받으니, curl에서는 `-c`(저장)와 `-b`(보내기)로 같은 파일을 써요.

맥 / 리눅스:

```bash
SLUG=<slug>   # 위에서 만든 시상식

# 프리셋 상 주기(이름 공개). 쿠키가 cookies.txt에 저장돼요.
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/ceremonies/$SLUG/trophies \
  -H 'Content-Type: application/json' \
  -d '{"awardId":"laugh","reason":"매일 웃게 해줘서","anonymous":false,"senderName":"하은"}'
# → 201 {"ok":true}

# 같은 쿠키로 한 번 더 → 409 already_given
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/ceremonies/$SLUG/trophies \
  -H 'Content-Type: application/json' \
  -d '{"awardId":"mood","reason":"","anonymous":true}'

# 다른 친구인 척 하려면 쿠키 파일을 바꿔요. 직접 지은 상은 awardId "custom" + customName('상'은 자동으로 붙어요)
curl -i -c cookies-friend2.txt -b cookies-friend2.txt -X POST http://localhost:3000/api/ceremonies/$SLUG/trophies \
  -H 'Content-Type: application/json' \
  -d '{"awardId":"custom","customName":"야식 요정","reason":"","anonymous":true}'

# 개수 확인(내용은 공개 전까지 나오지 않아요)
curl -s http://localhost:3000/api/ceremonies/$SLUG
```

윈도우(PowerShell): `-SessionVariable`로 받은 쿠키를 다음 요청에 `-WebSession`으로 넘겨요.

```powershell
$slug = "<slug>"
$uri = "http://localhost:3000/api/ceremonies/$slug/trophies"
$body = @{ awardId = "laugh"; reason = "매일 웃게 해줘서"; anonymous = $false; senderName = "하은" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri $uri -SessionVariable friend `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body))

# 같은 친구로 다시 보내기 → 409 (PowerShell 7이면 -SkipHttpErrorCheck로 body 확인)
Invoke-RestMethod -Method Post -Uri $uri -WebSession $friend `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

### 내 시상식 조회 (관리 API)

관리 링크 `#` 뒤의 토큰을 `Authorization: Bearer` 헤더로 보내요(주소나 쿼리로는 받지 않아요).
공개 전에는 개수만 오고, 트로피 내용은 서버에서 아예 읽지 않아요.

```bash
TOKEN=<관리 링크의 # 뒤>
curl -i http://localhost:3000/api/manage/$SLUG -H "Authorization: Bearer $TOKEN"
# 공개 전 → {"name":"지민","revealAt":"2026-12-31T12:00:00.000Z","trophyCount":3,"revealed":false}
```

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/manage/$slug" -Headers @{ Authorization = "Bearer $token" }
```

공개 후에는 `revealed: true`와 함께 `awards`가 와요. 상별로 묶고(직접 지은 상은 `key`가 `custom:이름`), 많이 받은 상부터, 각 상 안의 트로피는 오래된 순이에요. 익명 트로피의 `senderName`은 `null`이에요.

```json
{
  "name": "지민", "revealAt": "2026-12-31T12:00:00.000Z", "trophyCount": 3, "revealed": true,
  "awards": [
    { "key": "laugh", "name": "웃음 지분 1위상", "count": 2,
      "trophies": [{ "id": "…", "reason": "매일 웃게 해줘서", "senderName": "하은", "anonymous": false, "hidden": false, "createdAt": "…" }] }
  ]
}
```

### 응답 코드

시상식 만들기·조회:

| 상황 | 상태 | body |
|---|---|---|
| 만들기 성공 | 201 | `{ slug, manageUrl }` |
| 이름이 비었거나 8자 초과 | 400 | `{ error: "invalid", field: "name", message }` |
| 이름에 금지 단어 | 400 | `{ error: "profanity", field: "name", message: "다른 표현으로 바꿔주세요" }` |
| body가 JSON이 아님 | 400 | `{ error: "bad_request", message }` |
| 같은 IP에서 10분에 5번 넘게 요청(검증 실패 요청도 셈) | 429 | `{ error: "rate_limited", message: "잠시 후 다시 시도해 주세요" }` + `Retry-After`(초) |
| 공개 시각(2026-12-31 21:00 KST) 이후 만들기 | 410 | `{ error: "season_over", message }` |
| 없는 시상식, 숨김 처리, slug 형식 오류 | 404 | `{ error: "not_found", message }` |

상 주기(`POST /api/ceremonies/[slug]/trophies`):

| 상황 | 상태 | body |
|---|---|---|
| 상 주기 성공 | 201 | `{ ok: true }` |
| 입력 검증 실패(없는 awardId, 상 이름·닉네임 누락, 글자 수 초과) | 400 | `{ error: "invalid", field, message }` |
| 직접 지은 상 이름·사유·닉네임에 금지 단어 | 400 | `{ error: "profanity", field, message: "다른 표현으로 바꿔주세요" }` |
| body가 JSON이 아님 | 400 | `{ error: "bad_request", message }` |
| 없는 시상식, 숨김 처리, slug 형식 오류 | 404 | `{ error: "not_found", message }` |
| 이미 이 시상식에 상을 줌(같은 voterId) | 409 | `{ error: "already_given", message }` |
| 시상식의 공개 시각이 지남 | 410 | `{ error: "closed", message }` |
| 같은 IP에서 10분에 20번 넘게 요청(검증 실패·409도 셈) | 429 | `{ error: "rate_limited", message: "잠시 후 다시 시도해 주세요" }` + `Retry-After`(초) |

판단 순서: 시상식 없음(404) → 종료(410) → 요청 제한(429) → 입력 검증·금지 단어(400) → 이미 줌(409).
요청 제한 숫자는 `src/lib/constants.ts`의 `CREATE_RATE_LIMIT`, `TROPHY_RATE_LIMIT`, `RATE_LIMIT_WINDOW_SEC`에서 바꿔요.

내 시상식 조회(`GET /api/manage/[slug]`, 항상 `Cache-Control: no-store`):

| 상황 | 상태 | body |
|---|---|---|
| 공개 전 | 200 | `{ name, revealAt, trophyCount, revealed: false }` |
| 공개 후(서버 시각 ≥ revealAt) | 200 | `{ name, revealAt, trophyCount, revealed: true, awards }` |
| 토큰이 틀림·없음, 없는 시상식, slug 형식 오류 | 401 | `{ error: "unauthorized", message: "링크가 올바르지 않아요" }` |

## 운영

### 금지 단어 목록

- `data/badwords.txt`: 금지 단어. 한 줄에 한 단어, `#` 뒤는 주석이에요.
- `data/allowwords.txt`: 금지 단어가 들어 있어도 괜찮은 말(예: 시발점). 이 부분을 먼저 지우고 검사해요.
- 비교할 때 띄어쓰기·숫자·특수문자·이모지를 지우고, 같은 글자 3번 이상은 2번으로 줄여요. 한글 초성(ㅅㅂ 등)은 남겨요.
- 목록을 고친 뒤 배포하면 적용돼요(서버가 처음 쓸 때 읽어서 기억해 둬요).

### 신고 처리: 시상식 숨기기

친구 화면 맨 아래 "신고하기"는 `NEXT_PUBLIC_CONTACT_EMAIL`로 메일을 보내요(제목 `[신고] slug`).
신고가 오면 프로젝트 폴더에서 아래 명령으로 숨겨요. `.env.local`의 Firebase 계정으로 접속해요.

```bash
npx tsx scripts/hide-ceremony.ts <slug>            # 숨기기(status: hidden)
npx tsx scripts/hide-ceremony.ts <slug> --unhide   # 되돌리기(status: active)
```

이름·트로피 수·지금 상태를 보여준 뒤 `y`를 입력해야 바뀌어요. 숨기면 친구 화면·공개 조회·상 주기가 404가 되고,
트로피 문서와 주인공의 관리 링크는 그대로 남아요.
