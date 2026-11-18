/** 결과 공개 시각 기본값: 2026-12-31 21:00 KST. 시상식마다 revealAt으로 저장한다. */
export const REVEAL_AT = new Date("2026-12-31T12:00:00Z");

/** 글자 수 제한(Array.from 기준 글자 수). */
export const NAME_MAX = 8; // 주인공 이름 1~8
export const CUSTOM_AWARD_MAX = 12; // 직접 지은 상 이름 1~12 ('상' 포함)
export const REASON_MAX = 40; // 시상 사유 0~40
export const SENDER_MAX = 10; // 닉네임 1~10

/** 요청 횟수 제한(같은 IP 해시 기준, 고정 시간 창). 숫자는 여기서 조정한다. */
export const RATE_LIMIT_WINDOW_SEC = 10 * 60; // 10분
export const CREATE_RATE_LIMIT = 5; // 시상식 만들기: 10분에 5회
export const TROPHY_RATE_LIMIT = 20; // 상 주기: 10분에 20회
