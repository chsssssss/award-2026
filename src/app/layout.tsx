import type { Metadata, Viewport } from "next";
import { Nanum_Myeongjo, Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";

import { Analytics } from "@/components/Analytics";
import { baseOpenGraph, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

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

// 이미지(og:image)는 app/opengraph-image.tsx가 채우고, 하위 페이지가 따로 두지 않으면 물려받는다.
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: { ...baseOpenGraph, title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
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
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
