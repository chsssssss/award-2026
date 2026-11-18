// GET /api/manage/[slug] 응답 형식. 서버(manage.ts)와 화면(/m/[slug])이 같이 쓴다.

export type ManageTrophy = {
  id: string;
  reason: string;
  /** 익명이면 null */
  senderName: string | null;
  anonymous: boolean;
  hidden: boolean;
  /** ISO 문자열 */
  createdAt: string | null;
};

export type ManageAward = {
  /** 프리셋은 awardId, 직접 지은 상은 "custom:이름" */
  key: string;
  name: string;
  count: number;
  /** 오래된 순 */
  trophies: ManageTrophy[];
};

type ManageBase = {
  name: string;
  /** ISO 문자열 */
  revealAt: string;
  trophyCount: number;
};

/** 공개 전: 개수만. 트로피 내용은 없다. */
export type ManageBeforeReveal = ManageBase & { revealed: false };

/** 공개 후: 상별로 묶은 트로피. count 많은 순, 같으면 먼저 받은 상이 앞. */
export type ManageAfterReveal = ManageBase & { revealed: true; awards: ManageAward[] };

export type ManageResponse = ManageBeforeReveal | ManageAfterReveal;
