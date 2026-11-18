// 사용 이벤트 기록(PostHog). NEXT_PUBLIC_POSTHOG_KEY가 없으면 보내지 않는다.
// 이벤트와 속성을 아래 표로 고정해서 이름·메시지·토큰·IP 같은 값이 들어갈 자리를 만들지 않는다(CLAUDE.md).
// slug는 허용. 모든 이벤트에는 공통 속성 inApp('instagram' | 'kakaotalk' | 'other')이 붙는다(analytics.ts).

import { capture, type CaptureOptions } from "./analytics";
import type { AwardId } from "./awards";

type TrackEvents = {
  ceremony_created: { ref: string };
  manage_link_saved: { method: "copy" | "google_calendar" | "ics" | "confirm" };
  invite_image_opened: undefined;
  invite_image_shared: { method: "web_share" | "long_press_hint" };
  link_copied: { where: "share_sheet" | "owner_page" };
  vote_page_view: { slug: string };
  trophy_submitted: { awardId: AwardId | "custom" };
  done_cta_click: undefined;
};

export type TrackEvent = keyof TrackEvents;

type Args<E extends TrackEvent> = TrackEvents[E] extends undefined
  ? [props?: undefined, options?: CaptureOptions]
  : [props: TrackEvents[E], options?: CaptureOptions];

/** 이벤트 기록. 개발 환경에서는 console.debug로도 보여준다. 끝나기를 기다릴 필요는 없다. */
export function track<E extends TrackEvent>(event: E, ...[props, options]: Args<E>): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", event, props ?? {});
  }
  return capture(event, props, options).catch(() => {});
}
