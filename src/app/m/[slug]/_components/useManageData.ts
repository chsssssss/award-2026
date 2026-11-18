"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchJson } from "@/lib/fetch-json";
import type { ManageResponse } from "@/lib/manage-types";
import { daysUntil } from "@/lib/time";

export const POLL_INTERVAL_MS = 30_000;

export type ManageState =
  | { status: "loading" }
  | {
      status: "ready";
      data: ManageResponse;
      /** 공개까지 남은 날(한국 날짜 기준). 불러올 때마다 다시 계산한다. */
      days: number;
      /** 트로피가 늘었을 때 그 전 개수. 이 번호부터의 칸에 등장 효과를 준다. */
      newFrom: number | null;
    }
  | { status: "unauthorized" }
  | { status: "error"; message: string };

/**
 * GET /api/manage/[slug]를 토큰으로 불러온다.
 * 화면이 보일 때만 30초마다 다시 부르고, 다시 보이게 되면 바로 한 번 부른다.
 * 토큰은 Authorization 헤더로만 보내고 로그·에러 메시지에 넣지 않는다.
 */
export function useManageData(slug: string, token: string) {
  const [state, setState] = useState<ManageState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let stopped = false;

    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const result = await fetchJson<ManageResponse>(`/api/manage/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: current.signal,
      });
      if (stopped || current.signal.aborted) return;

      if (result.ok) {
        const data = result.data;
        if (data.revealed) stopped = true; // 공개 후에는 다시 부르지 않는다
        const days = daysUntil(new Date(data.revealAt), new Date());
        setState((prev) => {
          const prevCount = prev.status === "ready" ? prev.data.trophyCount : null;
          const newFrom =
            prevCount !== null && data.trophyCount > prevCount
              ? prevCount
              : prev.status === "ready"
                ? prev.newFrom
                : null;
          return { status: "ready", data, days, newFrom };
        });
      } else if (result.error === "aborted") {
        return;
      } else if (result.status === 401) {
        stopped = true;
        setState({ status: "unauthorized" });
      } else {
        // 이미 화면이 떠 있으면 일시적인 실패는 넘기고 다음 차례에 다시 부른다
        setState((prev) =>
          prev.status === "ready" ? prev : { status: "error", message: result.message },
        );
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible") {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    async function tick() {
      await load();
      schedule();
    }

    function onVisibilityChange() {
      if (stopped) return;
      if (document.visibilityState === "visible") void tick();
      else clearTimeout(timer);
    }

    void tick();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [slug, token, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
