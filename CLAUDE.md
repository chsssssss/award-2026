# 올해의 나 시상식

## 서비스
- 친구들이 링크(/s/[slug])로 들어와 주인공에게 상을 하나 골라 주고, 2026-12-31 21:00(KST)에 주인공에게만 결과가 공개되는 모바일 웹.
- 로그인 없음. 주인공은 만들 때 받은 비밀 관리 링크(/m/[slug]#[token])로 들어온다.
- 주요 환경은 인스타그램·카카오톡 인앱 브라우저. 모바일 우선, 콘텐츠 최대 너비 430px 가운데 정렬.

## 기술
- Next.js App Router + TypeScript + Tailwind CSS, Vercel 배포.
- Firestore는 서버(firebase-admin)에서만 접근. 클라이언트에서 Firebase SDK를 쓰지 않는다. 보안 규칙은 전부 거부.
- 입력 검증은 src/lib/schemas.ts의 zod 스키마를 클라이언트와 서버가 함께 쓴다.
- 이미지는 next/og ImageResponse(Node 런타임). flexbox만 사용.
- 에러 응답 형식: { error: 코드, message: 사용자에게 보여줄 한국어 문장 }.

## 데이터
- ceremonies/{slug}: name, ownerTokenHash, trophyCount, revealAt, status('active'|'hidden'), createdAt
- ceremonies/{slug}/trophies/{id}: awardId, customName, reason, senderName, anonymous, hidden, voterId, ipHash, createdAt. 문서 id = SHA-256(voterId) 앞 20자 → 같은 친구는 한 시상식에 한 번만.
- rateLimits/{key}: count, expireAt (Firestore TTL 정책으로 자동 삭제)

## 꼭 지킬 규칙
- 각 시상식의 revealAt(기본값 REVEAL_AT = 2026-12-31T12:00:00Z) 전에는 트로피 내용을 어떤 응답·props·이미지에도 넣지 않는다. 개수만 허용.
- revealAt 이후에는 새 트로피를 받지 않는다(410).
- 시각 판단은 항상 서버의 현재 시각으로.
- 관리 토큰 원본은 저장하지 않고 SHA-256 해시만. 토큰은 Authorization: Bearer 헤더로만 받는다.
- IP 원문은 저장하지 않는다. IP_HASH_SALT와 함께 해시.
- 토큰·IP·voterId·이름·메시지를 console.log, 분석 이벤트, 에러 리포트에 남기지 않는다.
- 글자 수: 주인공 이름 1~8, 직접 지은 상 이름 1~12, 시상 사유 0~40, 닉네임 1~10.
- localStorage/sessionStorage/clipboard 접근은 항상 try/catch (인앱 브라우저에서 실패할 수 있음).
- 문구는 해요체, 짧게. 이모지 쓰지 않음. 아이콘은 인라인 SVG.

## 디자인 (design/*.dc.html이 화면 레퍼런스. 인라인 style 값을 참고)
- 배경 #15131F / 카드 #221D33 / 보조 카드 #1D1A2B / 테두리 #3A3452 / 비활성 #2C2740 / 잠긴 트로피 #3B3555
- 글자 #F6F1E7 / 보조 글자 #ABA5BF / 약한 글자 #948EAD / 에러 글자 #FF8A7A
- 금색 #E8B84A / 진한 금색 #C9962E / 밝은 금색 #F7DE9C / 금색 위 글자 #1A1526
- 제목 Nanum Myeongjo 800, 본문 Noto Sans KR 400·500·700
- 모서리: 입력·작은 버튼 14px, 큰 버튼 16px, 카드 20~24px. 큰 버튼 높이 56px. 터치 영역 44px 이상. 입력창 글자 16px 이상.

## 상 프리셋 (id / 이름 / 설명)
laugh / 웃음 지분 1위상 / 제일 많이 웃겨줌
mood / 분위기 메이커상 / 모임 텐션 담당
counsel / 고민 상담소장상 / 새벽 전화도 OK
food / 맛집 레이더상 / 따라가면 성공
godlife / 갓생 실천상 / 미라클 모닝 장인
twist / 반전 매력상 / 알수록 새로움
reply / 답장 광속상 / 1분 안에 답장
ghost / 갑분잠수상 / 연락 두절의 아이콘
late / 프로 지각러상 / 5분만 늦을게
flex / 통 큰 플렉스상 / 계산은 내가
growth / 올해의 성장상 / 작년보다 멋짐
next / 내년 기대주상 / 내년이 더 기대됨

## 작업 방식
- 작업마다 npm run build, npm run lint, npm test 통과 후 커밋.
- 새 환경변수가 생기면 .env.example에 추가하고, Vercel에도 넣어야 한다고 알려준다.
- 개발 전용 페이지(/dev/*)와 미리보기 라우트는 프로덕션에서 404.
