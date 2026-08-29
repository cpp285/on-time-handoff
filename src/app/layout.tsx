import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "院内电子病历与准点交班演示",
  description: "电子病历负责书写，独立交班助手只读同步并生成全病区交班。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
