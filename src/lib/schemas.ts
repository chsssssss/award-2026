import { z } from "zod";

import { AWARD_IDS } from "./awards";
import {
  CUSTOM_AWARD_MAX,
  NAME_MAX,
  REASON_MAX,
  SENDER_MAX,
} from "./constants";

// 클라이언트와 서버가 함께 쓰는 입력 검증. 에러 메시지는 화면에 그대로 보여준다.

/** 화면에 보이는 글자 수(코드 포인트 기준). "지민😀" → 3 */
export function charLength(value: string): number {
  return Array.from(value).length;
}

/** 줄바꿈(앞뒤 공백 포함)은 공백 하나로 바꾸고 앞뒤 공백을 지운다. */
export function normalizeText(value: string): string {
  return value.replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/** 정리된 문자열 + 글자 수 범위 검사. */
function text(opts: {
  min: number;
  max: number;
  requiredMessage: string;
  maxMessage: string;
}) {
  return z
    .string({ error: opts.requiredMessage })
    .overwrite(normalizeText)
    .refine((v) => charLength(v) >= opts.min, { error: opts.requiredMessage })
    .refine((v) => charLength(v) <= opts.max, { error: opts.maxMessage });
}

const MESSAGES = {
  nameRequired: "이름을 입력해주세요",
  nameMax: `이름은 ${NAME_MAX}자까지 쓸 수 있어요`,
  awardRequired: "상을 하나 골라주세요",
  customRequired: "상 이름을 입력해주세요",
  customMax: `상 이름은 '상'을 포함해 ${CUSTOM_AWARD_MAX}자까지 쓸 수 있어요`,
  reasonMax: `시상 사유는 ${REASON_MAX}자까지 쓸 수 있어요`,
  senderRequired: "닉네임을 입력해주세요",
  senderMax: `닉네임은 ${SENDER_MAX}자까지 쓸 수 있어요`,
  reasonInvalid: "시상 사유를 다시 확인해주세요",
  anonymousInvalid: "익명 여부를 다시 골라주세요",
} as const;

export const createCeremonySchema = z.object({
  name: text({
    min: 1,
    max: NAME_MAX,
    requiredMessage: MESSAGES.nameRequired,
    maxMessage: MESSAGES.nameMax,
  }),
});

export type CreateCeremonyInput = z.input<typeof createCeremonySchema>;
export type CreateCeremonyData = z.output<typeof createCeremonySchema>;

const optionalText = z.string().overwrite(normalizeText).optional();

export const createTrophySchema = z
  .object({
    awardId: z.enum([...AWARD_IDS, "custom"], {
      error: MESSAGES.awardRequired,
    }),
    customName: optionalText,
    reason: text({
      min: 0,
      max: REASON_MAX,
      requiredMessage: MESSAGES.reasonInvalid,
      maxMessage: MESSAGES.reasonMax,
    }).default(""),
    senderName: optionalText,
    anonymous: z.boolean({ error: MESSAGES.anonymousInvalid }),
  })
  .transform((data, ctx) => {
    let failed = false;
    const fail = (path: "customName" | "senderName", message: string) => {
      failed = true;
      ctx.addIssue({ code: "custom", path: [path], message });
    };

    let customName: string | undefined;
    if (data.awardId === "custom") {
      const raw = data.customName ?? "";
      if (charLength(raw) === 0) {
        fail("customName", MESSAGES.customRequired);
      } else {
        const withSuffix = raw.endsWith("상") ? raw : `${raw}상`;
        if (charLength(withSuffix) > CUSTOM_AWARD_MAX) {
          fail("customName", MESSAGES.customMax);
        } else {
          customName = withSuffix;
        }
      }
    }

    let senderName: string | undefined;
    if (!data.anonymous) {
      const raw = data.senderName ?? "";
      if (charLength(raw) === 0) {
        fail("senderName", MESSAGES.senderRequired);
      } else if (charLength(raw) > SENDER_MAX) {
        fail("senderName", MESSAGES.senderMax);
      } else {
        senderName = raw;
      }
    }

    if (failed) return z.NEVER;

    return {
      awardId: data.awardId,
      customName, // awardId가 custom일 때만 값이 있다
      reason: data.reason,
      senderName, // anonymous면 항상 undefined
      anonymous: data.anonymous,
    };
  });

export type CreateTrophyInput = z.input<typeof createTrophySchema>;
export type CreateTrophyData = z.output<typeof createTrophySchema>;

/** 필드별 첫 번째 에러 메시지. 폼에서 입력창 아래에 보여줄 때 쓴다. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
