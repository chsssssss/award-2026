/** 결과 공개 시각 기본값: 2026-12-31 21:00 KST. 시상식마다 revealAt으로 저장한다. */
export const REVEAL_AT = new Date("2026-12-31T12:00:00Z");

/** 글자 수 제한(Array.from 기준 글자 수). */
export const NAME_MAX = 8; // 주인공 이름 1~8
export const CUSTOM_AWARD_MAX = 12; // 직접 지은 상 이름 1~12 ('상' 포함)
export const REASON_MAX = 40; // 시상 사유 0~40
export const SENDER_MAX = 10; // 닉네임 1~10
