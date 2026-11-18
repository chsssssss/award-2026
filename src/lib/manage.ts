import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { awardName } from "./awards";
import { ceremonyRef } from "./ceremonies";
import type { ManageAward, ManageResponse, ManageTrophy } from "./manage-types";
import { isRevealed } from "./time";
import { verifyOwner } from "./token";
import { TROPHIES } from "./trophies";

/**
 * 주인공용 시상식 데이터. 토큰이 틀리면(시상식이 없어도) null.
 * 공개 전(서버 시각 < revealAt)에는 개수만 돌려주고 trophies 하위 컬렉션을 아예 읽지 않는다.
 */
export async function getManageData(
  slug: string,
  authorizationHeader: string | null | undefined,
  now: Date,
): Promise<ManageResponse | null> {
  const ceremony = await verifyOwner(slug, authorizationHeader);
  if (!ceremony) return null;

  const base = {
    name: ceremony.name,
    revealAt: ceremony.revealAt.toISOString(),
    trophyCount: ceremony.trophyCount,
  };
  if (!isRevealed(ceremony.revealAt, now)) return { ...base, revealed: false };

  const snap = await ceremonyRef(slug).collection(TROPHIES).get();
  const awards = groupAwards(snap.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
  return { ...base, revealed: true, awards };
}

type Row = { key: string; name: string; createdMs: number; trophy: ManageTrophy };

/** 트로피 문서 하나를 응답 형식으로. voterId·ipHash는 옮기지 않는다. 형식이 깨진 문서는 null. */
function toRow(id: string, data: DocumentData): Row | null {
  let key: string;
  let name: string;
  if (data.awardId === "custom") {
    if (typeof data.customName !== "string" || !data.customName) return null;
    key = `custom:${data.customName}`;
    name = data.customName;
  } else if (typeof data.awardId === "string" && awardName(data.awardId)) {
    // 예전 프리셋으로 받은 트로피도 그 이름으로 보여 준다
    key = data.awardId;
    name = awardName(data.awardId) ?? data.awardId;
  } else {
    return null;
  }

  const anonymous = data.anonymous === true;
  const created = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
  return {
    key,
    name,
    createdMs: created ? created.getTime() : Number.POSITIVE_INFINITY,
    trophy: {
      id,
      reason: typeof data.reason === "string" ? data.reason : "",
      senderName: anonymous || typeof data.senderName !== "string" ? null : data.senderName,
      anonymous,
      hidden: data.hidden === true,
      createdAt: created ? created.toISOString() : null,
    },
  };
}

/** 앞선 쪽이 음수. 시각이 같거나 없으면(NaN) 다음 기준으로 넘긴다. */
const byTime = (a: number, b: number) => a - b || 0;
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 프리셋 상은 awardId로, 직접 지은 상은 상 이름으로 묶는다.
 * 상 순서: count 많은 순 → 첫 트로피를 먼저 받은 순. 각 상 안의 트로피: 오래된 순.
 */
export function groupAwards(docs: { id: string; data: DocumentData }[]): ManageAward[] {
  const rows = docs
    .map(({ id, data }) => toRow(id, data))
    .filter((row): row is Row => row !== null)
    .sort((a, b) => byTime(a.createdMs, b.createdMs) || byText(a.trophy.id, b.trophy.id));

  const groups = new Map<string, { award: ManageAward; firstMs: number }>();
  for (const row of rows) {
    let group = groups.get(row.key);
    if (!group) {
      group = { award: { key: row.key, name: row.name, count: 0, trophies: [] }, firstMs: row.createdMs };
      groups.set(row.key, group);
    }
    group.award.trophies.push(row.trophy);
    group.award.count += 1;
  }

  return [...groups.values()]
    .sort(
      (a, b) =>
        b.award.count - a.award.count ||
        byTime(a.firstMs, b.firstMs) ||
        byText(a.award.key, b.award.key),
    )
    .map((group) => group.award);
}

/** 트로피 문서 id: SHA-256(voterId) 앞 20자(hex). */
const TROPHY_ID = /^[0-9a-f]{20}$/;

/** 결과 화면에서만 쓰는 기능(메시지 숨기기)의 권한 확인: 토큰 → 공개 여부(서버 시각). */
export async function checkRevealedOwner(
  slug: string,
  authorizationHeader: string | null | undefined,
  now: Date,
): Promise<"ok" | "unauthorized" | "not_revealed"> {
  const ceremony = await verifyOwner(slug, authorizationHeader);
  if (!ceremony) return "unauthorized";
  return isRevealed(ceremony.revealAt, now) ? "ok" : "not_revealed";
}

/**
 * 메시지 숨기기/다시 보이기. 이 시상식 아래 경로로만 찾으므로 다른 시상식의 트로피는 찾지 못한다(false).
 * 개수(trophyCount)는 바꾸지 않는다.
 */
export async function updateTrophyHidden(slug: string, trophyId: string, hidden: boolean): Promise<boolean> {
  if (!TROPHY_ID.test(trophyId)) return false;
  const ref = ceremonyRef(slug).collection(TROPHIES).doc(trophyId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ hidden });
  return true;
}
