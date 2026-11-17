import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "올해의 나 시상식",
  description: "친구들이 골라 준 올해의 상을 12월 31일 밤에 열어 봐요.",
};

export const viewport: Viewport = {
  themeColor: "#15131F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
