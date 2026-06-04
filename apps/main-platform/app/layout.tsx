import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DIG | 上海摩拜单车数据挖掘展示平台",
  description: "基于数据挖掘结果的共享单车出行规律可视化展示平台。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
