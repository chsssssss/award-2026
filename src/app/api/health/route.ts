import { connection } from "next/server";

import { db } from "@/lib/firebase-admin";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  // 빌드 때 미리 렌더링하지 않고 항상 요청 시점에 실행한다.
  await connection();

  try {
    await db.collection("ceremonies").limit(1).get();
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    // 에러 메시지에는 키 일부가 섞일 수 있으므로 코드만 남긴다.
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "unknown";
    console.error(`[health] Firestore 연결 실패 (code: ${code})`);
    return Response.json({ ok: false }, { status: 500, headers: NO_STORE });
  }
}
