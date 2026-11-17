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

### 응답 코드

| 상황 | 상태 | body |
|---|---|---|
| 만들기 성공 | 201 | `{ slug, manageUrl }` |
| 이름이 비었거나 8자 초과 | 400 | `{ error: "invalid", field: "name", message }` |
| body가 JSON이 아님 | 400 | `{ error: "bad_request", message }` |
| 같은 IP에서 10분에 20개 넘게 만들기 | 429 | `{ error: "rate_limited", message }` + `Retry-After`(초) |
| 공개 시각(2026-12-31 21:00 KST) 이후 만들기 | 410 | `{ error: "season_over", message }` |
| 없는 시상식, 숨김 처리, slug 형식 오류 | 404 | `{ error: "not_found", message }` |
