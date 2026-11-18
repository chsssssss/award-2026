import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAward, isAwardId } from "./awards";
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
  } else if (typeof data.awardId === "string" && isAwardId(data.awardId)) {
    key = data.awardId;
    name = getAward(data.awardId)?.name ?? data.awardId;
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
