/** 상 프리셋(CLAUDE.md 기준, 화면에 보이는 순서). 인스타 스토리·게시물 테마. */
export const AWARDS = [
  { id: "story", name: "스토리 장인상", desc: "하루 스토리 열 개" },
  { id: "closefriend", name: "친한친구 단골상", desc: "초록 링 단골" },
  { id: "storyreply", name: "스토리 답장 광속상", desc: "올리자마자 답장" },
  { id: "birthday", name: "생일 스토리 1등상", desc: "축하는 제일 먼저" },
  { id: "feedtone", name: "피드 깔맞춤상", desc: "톤 맞추는 집념" },
  { id: "foodshot", name: "먹기 전 찰칵상", desc: "카메라가 먼저 먹음" },
  { id: "selfie", name: "셀카 각도 장인상", desc: "인생 각도를 앎" },
  { id: "travel", name: "여행 화보상", desc: "가는 곳마다 화보" },
  { id: "caption", name: "감성 글귀상", desc: "피드 글이 시집" },
  { id: "likefairy", name: "좋아요 요정상", desc: "하트는 제일 먼저" },
  { id: "reels", name: "릴스 배달부상", desc: "웃긴 릴스 배달 중" },
  { id: "lurker", name: "눈팅 고수상", desc: "보고는 다 봄" },
] as const;

/**
 * 예전 프리셋(2026-11-19 전). 이미 받은 트로피의 상 이름을 보여 주는 데에만 쓴다.
 * 새 트로피로는 줄 수 없다(createTrophySchema는 AWARD_IDS만 받는다). 지우지 말 것.
 */
const LEGACY_AWARDS = [
  { id: "laugh", name: "웃음 지분 1위상", desc: "제일 많이 웃겨줌" },
  { id: "mood", name: "분위기 메이커상", desc: "모임 텐션 담당" },
  { id: "counsel", name: "고민 상담소장상", desc: "새벽 전화도 OK" },
  { id: "food", name: "맛집 레이더상", desc: "따라가면 성공" },
  { id: "godlife", name: "갓생 실천상", desc: "미라클 모닝 장인" },
  { id: "twist", name: "반전 매력상", desc: "알수록 새로움" },
  { id: "reply", name: "답장 광속상", desc: "1분 안에 답장" },
  { id: "ghost", name: "갑분잠수상", desc: "연락 두절의 아이콘" },
  { id: "late", name: "프로 지각러상", desc: "5분만 늦을게" },
  { id: "flex", name: "통 큰 플렉스상", desc: "계산은 내가" },
  { id: "growth", name: "올해의 성장상", desc: "작년보다 멋짐" },
  { id: "next", name: "내년 기대주상", desc: "내년이 더 기대됨" },
] as const;

export type AwardId = (typeof AWARDS)[number]["id"];

export type Award = { id: AwardId; name: string; desc: string };

export const AWARD_IDS = AWARDS.map((award) => award.id) as [AwardId, ...AwardId[]];

const byId: ReadonlyMap<string, Award> = new Map(AWARDS.map((award) => [award.id, award]));

const nameById: ReadonlyMap<string, string> = new Map(
  [...LEGACY_AWARDS, ...AWARDS].map((award) => [award.id, award.name]),
);

/** 지금 줄 수 있는 프리셋 상인지(새 트로피 검증용). */
export function isAwardId(id: string): id is AwardId {
  return byId.has(id);
}

/** 지금 프리셋 상. 모르는 id나 예전 상이면 undefined. */
export function getAward(id: string): Award | undefined {
  return byId.get(id);
}

/** 저장된 트로피의 상 이름(지금 상 + 예전 상). 모르는 id면 undefined. */
export function awardName(id: string): string | undefined {
  return nameById.get(id);
}
