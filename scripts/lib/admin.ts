// 운영·테스트 스크립트 공통: .env.local을 읽어 firebase-admin Firestore에 접속한다.
// (src/lib/firebase-admin.ts는 server-only라서 스크립트에서 불러올 수 없다)
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** src/lib/firebase-admin.ts의 normalizePrivateKey와 같은 처리. */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (key.length >= 2 && ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\r\\n|\\n/g, "\n").trim();
}

export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** 프로젝트 폴더의 .env.local을 읽는다. */
export function loadEnv(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    fail(".env.local을 찾을 수 없어요. 프로젝트 폴더에서 실행해 주세요.");
  }
}

export function connectFirestore(): Firestore {
  loadEnv();
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    fail(".env.local에 FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY가 필요해요.");
  }
  return getFirestore(
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(FIREBASE_PRIVATE_KEY),
      }),
    }),
  );
}
