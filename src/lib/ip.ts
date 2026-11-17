import "server-only";

import { createHash } from "node:crypto";

/** 클라이언트 IP. x-forwarded-for 첫 값 → x-real-ip → 'unknown'. 원문은 저장·로그하지 않는다. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/** SHA-256(IP_HASH_SALT + ip) hex. 솔트가 없으면 해시가 쉽게 역산되므로 에러를 낸다. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("IP_HASH_SALT 환경변수가 없어요");
  return createHash("sha256").update(salt + ip).digest("hex");
}
