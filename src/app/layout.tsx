import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const bodyFont = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"]
});

const displayFont = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "社媒平台运营小组线索台",
  description: "中国品牌团队的热点传播工作台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
