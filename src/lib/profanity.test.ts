import { describe, expect, it } from "vitest";

import { createProfanityFilter, normalize, parseWordList } from "./profanity";

// 실제 욕설 대신 테스트 전용 가짜 단어를 쓴다.
const filter = createProfanityFilter({
  badWords: ["나쁜말", "멍청", "ㅂㅂ", "badword"],
  allowWords: ["멍청이나무", "덜멍청"],
});
const has = (text: string) => filter.containsProfanity(text);

describe("normalize", () => {
  it("NFC → 소문자 → 글자만 남기고 → 3번 이상 반복은 2번", () => {
    expect(normalize("BadWord")).toBe("badword");
    expect(normalize("나 쁜, 말!!")).toBe("나쁜말");
    expect(normalize("나1쁜2말3")).toBe("나쁜말");
    expect(normalize("나😀쁜✨말")).toBe("나쁜말");
    expect(normalize("나​쁜ㅤ말")).toBe("나쁜말"); // 폭 없는 공백, 한글 채움 문자
    expect(normalize("나아아아아쁜말")).toBe("나아아쁜말"); // "아" 4번 → 2번
    expect(normalize("ㅋㅋㅋㅋㅋ")).toBe("ㅋㅋ");
  });

  it("한글 초성은 지우지 않아요", () => {
    expect(normalize("ㅂ ㅂ")).toBe("ㅂㅂ");
    expect(normalize("ㄱㄴㄷ")).toBe("ㄱㄴㄷ");
  });

  it("분해된 한글(NFD)도 합쳐서 비교해요", () => {
    expect(normalize("나쁜말".normalize("NFD"))).toBe("나쁜말");
  });
});

describe("parseWordList", () => {
  it("한 줄에 한 단어, # 주석과 빈 줄은 건너뛰어요", () => {
    expect(parseWordList("# 머리말\n나쁜말\n\n  멍청  # 뒤 주석\r\nbadword\n#끝")).toEqual([
      "나쁜말",
      "멍청",
      "badword",
    ]);
  });
});

describe("containsProfanity (가짜 목록)", () => {
  it("그대로 쓴 단어", () => {
    expect(has("나쁜말")).toBe(true);
    expect(has("그건 나쁜말이야")).toBe(true);
    expect(has("BADWORD")).toBe(true);
  });

  it("띄어쓰기를 끼운 변형", () => {
    expect(has("나 쁜 말")).toBe(true);
    expect(has("멍   청")).toBe(true);
    expect(has("ㅂ ㅂ")).toBe(true);
  });

  it("특수문자·숫자·이모지를 끼운 변형", () => {
    expect(has("나.쁜.말")).toBe(true);
    expect(has("나1쁜2말")).toBe(true);
    expect(has("멍💩청")).toBe(true);
    expect(has("b-a-d_w.o.r.d")).toBe(true);
    expect(has("나​쁜말")).toBe(true);
  });

  it("반복 글자", () => {
    expect(has("나쁜말말말말")).toBe(true);
    expect(has("멍멍멍청")).toBe(true); // 멍멍멍 → 멍멍, 그 뒤에 멍청
    expect(has("ㅂㅂㅂㅂㅂ")).toBe(true);
  });

  it("예외 단어가 들어간 정상 문장은 통과", () => {
    expect(has("멍청이나무 아래에서 만나")).toBe(false);
    expect(has("덜멍청해졌어")).toBe(false);
    expect(has("멍청이 나무")).toBe(false); // 띄어 써도 예외 단어
  });

  it("예외 단어를 지운 뒤에도 남은 금지 단어는 잡아요", () => {
    expect(has("멍청이나무 그리고 나쁜말")).toBe(true);
    expect(has("멍청이나무 멍청")).toBe(true);
  });

  it("예외 단어를 지워서 앞뒤가 붙어도 새 금지 단어가 되지 않아요", () => {
    // "나쁜" + [멍청이나무] + "말" → 지운 자리를 빈칸으로 두므로 "나쁜말"이 되지 않는다
    expect(has("나쁜멍청이나무말")).toBe(false);
  });

  it("정상 문장과 빈 값은 통과", () => {
    expect(has("단톡방을 살린 일등공신")).toBe(false);
    expect(has("웃음 지분 1위상")).toBe(false);
    expect(has("")).toBe(false);
    expect(has("!!! 123 😀")).toBe(false);
  });
});
