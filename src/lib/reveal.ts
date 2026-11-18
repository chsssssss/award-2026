// 결과 화면(공개 후) 표시용 작은 계산.

import type { ManageTrophy } from "./manage-types";

/** 메시지 카드의 보낸 사람. 익명이거나 이름이 없으면 "익명". */
export function senderLabel(trophy: Pick<ManageTrophy, "anonymous" | "senderName">): string {
  return trophy.anonymous || !trophy.senderName ? "익명" : trophy.senderName;
}

/** 메시지 카드의 본문. 사유가 비어 있으면 null(화면에서 "(남긴 말 없음)"). */
export function reasonText(trophy: Pick<ManageTrophy, "reason">): string | null {
  const text = trophy.reason.trim();
  return text ? text : null;
}

/** 한 번에 보여줄 메시지 수. 넘치면 "메시지 N개 더 보기". */
export const MESSAGES_PAGE = 10;
