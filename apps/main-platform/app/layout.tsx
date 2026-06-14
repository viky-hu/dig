import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InsightTransitionProvider } from "./insights/InsightTransitionProvider";
import "./globals.css";
import "./fonts/ding-talk-jin-bu-ti/font.css";

export const metadata: Metadata = {
  title: "DIG | 上海摩拜单车数据挖掘分析报告",
  description: "上海摩拜单车数据挖掘分析报告。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <InsightTransitionProvider>{children}</InsightTransitionProvider>
      </body>
    </html>
  );
}
