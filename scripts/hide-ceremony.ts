/**
 * 시상식 숨기기 / 되돌리기 (관리자용)
 *
 *   npx tsx scripts/hide-ceremony.ts <slug>            → status를 hidden으로
 *   npx tsx scripts/hide-ceremony.ts <slug> --unhide   → status를 active로
 *
 * 프로젝트 폴더에서 실행한다(.env.local의 Firebase 서비스 계정으로 접속).
 * 바꾸기 전에 이름·트로피 수·지금 상태를 보여주고, y를 입력했을 때만 바꾼다.
 * 숨기면 친구 화면·공개 조회·상 주기가 404가 된다. 트로피 문서는 지우지 않는다.
 */
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { isValidSlug } from "../src/lib/slug";
import { connectFirestore, fail } from "./lib/admin";

const USAGE = "사용법: npx tsx scripts/hide-ceremony.ts <slug> [--unhide]";

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("--"));
  const positional = args.filter((arg) => !arg.startsWith("--"));
  if (positional.length !== 1 || flags.some((flag) => flag !== "--unhide")) fail(USAGE);

  const slug = positional[0];
  const next = flags.includes("--unhide") ? "active" : "hidden";
  if (!isValidSlug(slug)) fail(`slug 형식이 올바르지 않아요: ${slug}`);

  const db = connectFirestore();

  const ref = db.collection("ceremonies").doc(slug);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || !data) fail(`시상식이 없어요: ${slug}`);

  const current = data.status === "hidden" ? "hidden" : "active";
  console.log(`시상식 ${slug}`);
  console.log(`  이름: ${String(data.name ?? "")}`);
  console.log(`  트로피: ${typeof data.trophyCount === "number" ? data.trophyCount : 0}개`);
  console.log(`  지금 상태: ${current}`);

  if (current === next) {
    console.log(`이미 ${next} 상태예요. 바꾸지 않았어요.`);
    return;
  }

  const rl = createInterface({ input, output });
  const question = next === "hidden" ? "이 시상식을 숨길까요?" : "이 시상식을 다시 보이게 할까요?";
  const answer = (await rl.question(`${question} 진행하려면 y를 입력하세요: `)).trim().toLowerCase();
  rl.close();
  if (answer !== "y") {
    console.log("취소했어요. 바꾸지 않았어요.");
    return;
  }

  await ref.update({ status: next });
  const after = (await ref.get()).data();
  console.log(`완료: status ${current} → ${String(after?.status)}`);
  console.log(
    next === "hidden"
      ? "친구 화면(/s)·공개 조회·상 주기가 이제 404예요. 주인공의 관리 링크와 트로피 문서는 그대로예요."
      : "다시 친구들이 보고 상을 줄 수 있어요.",
  );
}

main().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  fail(`실패했어요${code ? ` (code: ${code})` : ""}: ${error instanceof Error ? error.message : String(error)}`);
});
