/** 상 프리셋(CLAUDE.md 기준, 화면에 보이는 순서). */
export const AWARDS = [
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

export const AWARD_IDS = AWARDS.map((award) => award.id) as [
  AwardId,
  ...AwardId[],
];

const byId: ReadonlyMap<string, Award> = new Map(
  AWARDS.map((award) => [award.id, award]),
);

export function isAwardId(id: string): id is AwardId {
  return byId.has(id);
}

/** id에 맞는 상. 모르는 id(예: DB의 오래된 값)면 undefined. */
export function getAward(id: string): Award | undefined {
  return byId.get(id);
}
