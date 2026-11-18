import { describe, expect, it } from "vitest";

import {
  charLength,
  createCeremonySchema,
  createTrophySchema,
  fieldErrors,
  normalizeText,
} from "./schemas";

function errorsOf(result: { success: boolean; error?: unknown }) {
  if (result.success) throw new Error("검증이 실패해야 해요");
  return fieldErrors(result.error as never);
}

describe("charLength / normalizeText", () => {
  it("이모지가 섞여도 화면 기준 글자 수로 세요", () => {
    expect(charLength("지민😀")).toBe(3);
    expect("지민😀".length).toBe(4); // UTF-16 기준이면 4
  });

  it("앞뒤 공백을 지우고 줄바꿈은 공백 하나로 바꿔요", () => {
    expect(normalizeText("  고마워\n\n  올해도 \r\n잘 부탁해  ")).toBe(
      "고마워 올해도 잘 부탁해",
    );
  });
});

describe("createCeremonySchema", () => {
  it("이름 8자는 통과해요", () => {
    const result = createCeremonySchema.safeParse({ name: "가나다라마바사아" });
    expect(result.success).toBe(true);
  });

  it("이름 9자는 막고 한국어 메시지를 줘요", () => {
    const result = createCeremonySchema.safeParse({ name: "가나다라마바사아자" });
    expect(errorsOf(result)).toEqual({ name: "이름은 8자까지 쓸 수 있어요" });
  });

  it("이모지가 섞인 이름도 글자 수로 판단해요", () => {
    // UTF-16 length는 14지만 글자 수는 8
    const eight = createCeremonySchema.safeParse({ name: "지민😀😀😀😀😀😀" });
    expect(eight.success).toBe(true);
    const nine = createCeremonySchema.safeParse({ name: "지민😀😀😀😀😀😀😀" });
    expect(nine.success).toBe(false);
  });

  it("앞뒤 공백을 지운 뒤 비어 있으면 막아요", () => {
    const result = createCeremonySchema.safeParse({ name: "   \n " });
    expect(errorsOf(result)).toEqual({ name: "이름을 입력해주세요" });
  });

  it("값을 정리해서 돌려줘요", () => {
    const result = createCeremonySchema.parse({ name: "  지민\n" });
    expect(result).toEqual({ name: "지민" });
  });
});

describe("createTrophySchema", () => {
  const base = { reason: "", anonymous: true } as const;

  it("프리셋 상은 그대로 통과하고 customName은 버려요", () => {
    const result = createTrophySchema.parse({
      ...base,
      awardId: "story",
      customName: "무시될 이름",
    });
    expect(result.awardId).toBe("story");
    expect(result.customName).toBeUndefined();
  });

  it("예전 프리셋 상(laugh 등)으로는 새로 줄 수 없어요", () => {
    for (const awardId of ["laugh", "mood", "ghost", "next"]) {
      expect(createTrophySchema.safeParse({ awardId, reason: "", anonymous: true }).success).toBe(false);
    }
  });

  it("모르는 awardId는 막아요", () => {
    const result = createTrophySchema.safeParse({ ...base, awardId: "nope" });
    expect(errorsOf(result)).toEqual({ awardId: "상을 하나 골라주세요" });
  });

  it("custom인데 상 이름이 없으면 막아요", () => {
    for (const customName of [undefined, "", "   "]) {
      const result = createTrophySchema.safeParse({
        ...base,
        awardId: "custom",
        customName,
      });
      expect(errorsOf(result)).toEqual({ customName: "상 이름을 입력해주세요" });
    }
  });

  it("상 이름이 '상'으로 끝나지 않으면 붙여요", () => {
    const result = createTrophySchema.parse({
      ...base,
      awardId: "custom",
      customName: " 야식 요정 ",
    });
    expect(result.customName).toBe("야식 요정상");
  });

  it("이미 '상'으로 끝나면 그대로 둬요", () => {
    const result = createTrophySchema.parse({
      ...base,
      awardId: "custom",
      customName: "야식 요정상",
    });
    expect(result.customName).toBe("야식 요정상");
  });

  it("'상'을 붙인 뒤 12자를 넘으면 막아요", () => {
    const eleven = createTrophySchema.parse({
      ...base,
      awardId: "custom",
      customName: "가나다라마바사아자차카", // 11자 + 상 = 12자
    });
    expect(eleven.customName).toBe("가나다라마바사아자차카상");

    const twelve = createTrophySchema.safeParse({
      ...base,
      awardId: "custom",
      customName: "가나다라마바사아자차카타", // 12자 + 상 = 13자
    });
    expect(errorsOf(twelve)).toEqual({
      customName: "상 이름은 '상'을 포함해 12자까지 쓸 수 있어요",
    });
  });

  it("익명이면 senderName을 무시하고 undefined로 돌려줘요", () => {
    const result = createTrophySchema.parse({
      awardId: "selfie",
      reason: "",
      anonymous: true,
      senderName: "보낸 사람",
    });
    expect(result.senderName).toBeUndefined();
  });

  it("익명이 아니면 senderName이 필요해요", () => {
    const missing = createTrophySchema.safeParse({
      awardId: "selfie",
      reason: "",
      anonymous: false,
    });
    expect(errorsOf(missing)).toEqual({ senderName: "닉네임을 입력해주세요" });

    const ok = createTrophySchema.parse({
      awardId: "selfie",
      reason: "",
      anonymous: false,
      senderName: " 하은 ",
    });
    expect(ok.senderName).toBe("하은");
  });

  it("닉네임 10자는 통과, 11자는 막아요", () => {
    const input = { awardId: "selfie", reason: "", anonymous: false } as const;
    expect(
      createTrophySchema.safeParse({ ...input, senderName: "가나다라마바사아자차" })
        .success,
    ).toBe(true);
    const result = createTrophySchema.safeParse({
      ...input,
      senderName: "가나다라마바사아자차카",
    });
    expect(errorsOf(result)).toEqual({
      senderName: "닉네임은 10자까지 쓸 수 있어요",
    });
  });

  it("상 이름과 닉네임 에러를 함께 알려줘요", () => {
    const result = createTrophySchema.safeParse({
      awardId: "custom",
      reason: "",
      anonymous: false,
    });
    expect(errorsOf(result)).toEqual({
      customName: "상 이름을 입력해주세요",
      senderName: "닉네임을 입력해주세요",
    });
  });

  it("시상 사유는 비어도 되고 40자까지 돼요", () => {
    expect(createTrophySchema.parse({ awardId: "travel", anonymous: true }).reason).toBe(
      "",
    );
    const forty = "가".repeat(40);
    expect(
      createTrophySchema.safeParse({ awardId: "travel", anonymous: true, reason: forty })
        .success,
    ).toBe(true);
    const result = createTrophySchema.safeParse({
      awardId: "travel",
      anonymous: true,
      reason: forty + "가",
    });
    expect(errorsOf(result)).toEqual({
      reason: "시상 사유는 40자까지 쓸 수 있어요",
    });
  });
});
