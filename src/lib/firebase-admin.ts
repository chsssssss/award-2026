import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase-admin/firestore";

const APP_NAME = "award-2026-admin";

/**
 * 환경변수에 들어 있는 비공개 키를 PEM 형식으로 맞춘다.
 * - "\n" 문자열(역슬래시+n)은 실제 줄바꿈으로 바꾼다. 이미 줄바꿈이면 그대로 둔다.
 * - 값 전체를 감싼 따옴표가 남아 있으면 벗긴다(Vercel 대시보드에 따옴표째 붙여넣은 경우).
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    key.length >= 2 &&
    ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'")))
  ) {
    key = key.slice(1, -1);
  }
  return key
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function readEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const missing = [
    !projectId && "FIREBASE_PROJECT_ID",
    !clientEmail && "FIREBASE_CLIENT_EMAIL",
    !privateKey && "FIREBASE_PRIVATE_KEY",
  ].filter(Boolean);

  if (missing.length > 0 || !projectId || !clientEmail || !privateKey) {
    // 변수 이름만 알려주고 값은 절대 메시지에 넣지 않는다.
    throw new Error(`Firebase 환경변수가 없어요: ${missing.join(", ")}`);
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

let cached: Firestore | undefined;

/**
 * Admin SDK를 처음 쓸 때 한 번만 초기화하고 Firestore 인스턴스를 돌려준다.
 * 모듈을 import하는 것만으로는 초기화하지 않으므로, 환경변수가 없는 빌드 단계에서도 안전하다.
 * 개발 서버 HMR로 모듈이 다시 평가돼도 이미 만든 앱을 재사용한다.
 */
export function getDb(): Firestore {
  if (cached) return cached;

  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) {
    cached = getFirestore(existing);
    return cached;
  }

  const { projectId, clientEmail, privateKey } = readEnv();
  const app = initializeApp(
    {
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    },
    APP_NAME,
  );
  // 서버리스(Vercel) 콜드 스타트를 줄이려고 gRPC 대신 REST를 우선 사용한다.
  cached = initializeFirestore(app, { preferRest: true });
  return cached;
}

/**
 * Firestore 인스턴스. 실제 초기화는 첫 사용 시점(예: db.collection(...))에 일어난다.
 */
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
