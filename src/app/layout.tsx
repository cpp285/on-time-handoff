import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "准点交班｜口腔颌面头颈肿瘤科",
  description: "病史写完一键生成全病区交班，逐人核对后统一打印。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
