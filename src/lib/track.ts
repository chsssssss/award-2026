// 사용 이벤트 기록. 지금은 빈 함수이고 나중에 분석 도구를 붙인다.
// 이벤트와 속성을 아래 표로 고정해서 이름·토큰·IP·메시지 같은 값이 들어갈 자리를 만들지 않는다(CLAUDE.md).

type TrackEvents = {
  invite_image_opened: undefined;
  invite_image_shared: { method: "web_share" | "long_press_hint" };
  link_copied: { where: "share_sheet" | "owner_page" };
};

export type TrackEvent = keyof TrackEvents;

export function track<E extends TrackEvent>(
  event: E,
  ...[props]: TrackEvents[E] extends undefined ? [] : [TrackEvents[E]]
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", event, props ?? {});
  }
}
