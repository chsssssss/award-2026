import type { Metadata, Viewport } from "next";
import { Nanum_Myeongjo, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 한글 글리프는 Google Fonts가 unicode-range로 잘게 나눠 제공하고, next/font의 subsets에는
// "korean"이 없다. preload를 켜면 latin 조각만 미리 받게 되므로 preload를 끈다.
const nanumMyeongjo = Nanum_Myeongjo({
  weight: ["700", "800"],
  variable: "--font-nanum-myeongjo",
  display: "swap",
  preload: false,
});

const notoSansKr = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "올해의 나 시상식",
  description: "친구들이 골라 준 올해의 상을 12월 31일 밤에 열어 봐요.",
};

// 확대(maximumScale, userScalable)는 막지 않는다(접근성).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15131F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${nanumMyeongjo.variable} ${notoSansKr.variable} antialiased`}
    >
      <body className="bg-bg font-sans text-ink">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
