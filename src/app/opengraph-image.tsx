import { renderDefaultImage } from "@/lib/og-image";

export const alt = "올해 나는 무슨 상을 받을까? 올해의 나 시상식";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderDefaultImage();
}
