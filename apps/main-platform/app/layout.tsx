import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InsightTransitionProvider } from "./insights/InsightTransitionProvider";
import "./globals.css";
import "./fonts/ding-talk-jin-bu-ti/font.css";

export const metadata: Metadata = {
  title: "骑迹上海——上海摩拜共享单车动态规律分析可视化展示平台",
  description: "骑迹上海——上海摩拜共享单车动态规律分析可视化展示平台，以交互式可视化呈现骑行数据的时间规律、骑行时长、空间热点与区域流向。",
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
