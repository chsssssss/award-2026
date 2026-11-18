"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { capturePageview } from "@/lib/analytics";

/** 경로가 바뀔 때마다 페이지뷰를 보낸다(주소는 # 뒤·쿼리 값을 지워서). 키가 없으면 아무것도 안 함. */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    void capturePageview();
  }, [pathname]);
  return null;
}
