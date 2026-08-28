import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "准点交班｜病区电子交班工作台",
  description: "AI 整理、医生核对、可追溯的病区电子交班演示系统。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
