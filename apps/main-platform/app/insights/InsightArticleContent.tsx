"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { LOGO_DRAW_EASE } from "../home/shared/animation";
import { bikePathData } from "../home/utils";
import type { InsightSlug } from "./config";

const INSIGHT_TITLES: Record<InsightSlug, string> = {
  "insight-01": "项目总览",
  "insight-02": "数据清洗与可信度",
  "insight-03": "时间规律",
  "insight-04": "骑行时长",
  "insight-05": "空间热点聚类",
  "insight-06": "区域流向分析",
  "insight-07": "区域画像对比",
  "insight-08": "结论、局限与展望",
};

const numberFormatter = new Intl.NumberFormat("en-US");

const overviewOrderStats = {
  rawOrders: 102_361,
  validOrders: 102_210,
  removedOrders: 151,
};

const overviewCoverageStats = {
  riders: 16_883,
  bikes: 78_985,
};

const overviewDurationStat = {
  label: "单次骑行平均时长",
  value: "16.49 分钟",
  note: "中位数 11 分钟，说明短途接驳占主流",
  averageMinutes: 16.49,
  medianMinutes: 11,
  maxMinutes: 30,
};

const overviewFindings = [
  {
    index: "01",
    title: "通勤双峰很清晰",
    body:
      "工作日 08:00 与 18:00 构成最稳定的两个高峰，晚高峰强于早高峰，说明下班后的目的地更分散。",
    facts: ["08:00 为 8,477 单", "18:00 为 10,118 单", "工作日订单占比 74.4%"],
  },
  {
    index: "02",
    title: "共享单车承担的是短途接驳",
    body:
      "骑行时长明显右偏，但主体高度集中在短时区间。平均 16.49 分钟，中位数 11 分钟，符合最后一公里场景。",
    facts: ["5 到 20 分钟占比 63.7%", "超过 60 分钟仅占 2.5%", "异常长尾截断到 180 分钟"],
  },
  {
    index: "03",
    title: "需求集中在核心城区",
    body:
      "空间聚类与 OD 分析共同说明，骑行需求主要聚集在城市核心活跃区，而且绝大多数订单在同一区域内完成闭环。",
    facts: ["Top 3 热点区域贡献 59.6%", "区域内骑行占比超过 85%", "浦东核心为最大单一热点"],
  },
];

const overviewMeta = [
  { label: "Edition", value: "Overview / Vol. 01" },
  { label: "Window", value: "2016.08.01 - 2016.08.31" },
  { label: "Location", value: "Shanghai Mobike Sample" },
  { label: "Quality", value: "151 条异常记录剔除" },
];

const overviewScope = [
  {
    label: "数据时间窗",
    value: "31 天",
    description: "样本覆盖 2016 年 8 月完整自然月，保留了工作日与周末的完整对比条件。",
  },
  {
    label: "字段结构",
    value: "14 列",
    description: "包含时间、起终点坐标、用户与车辆编号，以及清洗后补充的时长和时间特征字段。",
  },
  {
    label: "清洗结果",
    value: "0.1% 剔除率",
    description: "主要剔除了超长时长与极少量坐标异常记录，整体样本可信度较高。",
  },
];

const overviewSignals = [
  {
    label: "工作日 / 周末",
    value: "76,044 / 26,166",
    note: "工作日明显主导，周末更偏向平缓休闲出行。",
  },
  {
    label: "峰值时段",
    value: "18:00",
    note: "晚高峰高于早高峰，说明下班后的落点更分散。",
  },
  {
    label: "热点结构",
    value: "K = 6",
    note: "聚类结果把核心骑行活动压缩成六个主要热点区域。",
  },
];

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function OverviewBikeFigure({ play }: { play: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const bike = useMemo(() => bikePathData(360, 220), []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const paths = svg.querySelectorAll<SVGPathElement>(".insight-overview-bike-path");
    const accent = svg.querySelector<SVGPathElement>(".insight-overview-bike-accent");
    const ctx = gsap.context(() => {
      if (!play) {
        gsap.set([paths, accent].filter(Boolean), { autoAlpha: 0 });
        return;
      }

      paths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
          autoAlpha: 1,
        });
      });

      if (accent) {
        gsap.set(accent, { autoAlpha: 0 });
      }

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      if (accent) {
        tl.to(accent, { autoAlpha: 1, duration: 0.18 }, 0.08);
      }
      tl.to(
        paths,
        {
          strokeDashoffset: 0,
          autoAlpha: 1,
          duration: 0.72,
          ease: LOGO_DRAW_EASE,
          stagger: 0.018,
        },
        0.12,
      );

      return () => tl.kill();
    }, svg);

    return () => ctx.revert();
  }, [play]);

  return (
    <div className="insight-overview-bike-figure" aria-hidden="true">
      <svg
        ref={svgRef}
        className="insight-overview-bike-svg"
        viewBox="0 0 360 220"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="overview-bike-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path className="insight-overview-bike-accent" d="M 24 184 C 82 122 142 96 210 106 C 262 114 305 139 336 179" />
        {bike.paths.map((path, index) => (
          <path
            key={index}
            className="insight-overview-bike-path"
            d={path}
            filter="url(#overview-bike-glow)"
          />
        ))}
      </svg>
    </div>
  );
}

function MetricDurationViz({
  averageMinutes,
  medianMinutes,
  maxMinutes,
}: {
  averageMinutes: number;
  medianMinutes: number;
  maxMinutes: number;
}) {
  const averagePercent = `${Math.min(100, (averageMinutes / maxMinutes) * 100)}%`;
  const medianPercent = `${Math.min(100, (medianMinutes / maxMinutes) * 100)}%`;

  return (
    <div className="insight-overview-duration-viz" aria-hidden="true">
      <div className="insight-overview-duration-track">
        <div className="insight-overview-duration-arrow" style={{ width: averagePercent }} />
        <div className="insight-overview-duration-median" style={{ left: medianPercent }} />
      </div>
      <div className="insight-overview-duration-labels">
        <span>0 分钟</span>
        <span>30 分钟参考上限</span>
      </div>
      <div className="insight-overview-duration-callout insight-overview-duration-callout-average" style={{ left: averagePercent }}>
        平均 16.49 分钟
      </div>
      <div className="insight-overview-duration-callout insight-overview-duration-callout-median" style={{ left: medianPercent }}>
        中位数 11 分钟
      </div>
    </div>
  );
}

function OverviewOrderQualityPanel() {
  return (
    <article className="insight-overview-metric insight-overview-metric-orders">
      <div className="insight-overview-metric-copy">
        <p className="insight-news-card-label">八月有效骑行订单</p>
        <strong className="insight-overview-metric-value">{formatCount(overviewOrderStats.validOrders)}</strong>
      </div>

      <div className="insight-overview-order-statement">
        <span>保留 {formatCount(overviewOrderStats.validOrders)} 条有效订单</span>
        <span>仅剔除 {formatCount(overviewOrderStats.removedOrders)} 条异常记录</span>
      </div>

      <div className="insight-overview-order-meta">
        <span>原始样本 {formatCount(overviewOrderStats.rawOrders)}</span>
        <span>有效保留率 99.85%</span>
      </div>
    </article>
  );
}

function OverviewCoveragePanel() {
  const ratio = overviewCoverageStats.bikes / overviewCoverageStats.riders;

  return (
    <article className="insight-overview-metric insight-overview-metric-scale">
      <div className="insight-overview-metric-copy">
        <p className="insight-news-card-label">参与骑行的独立用户 / 投入使用的独立单车</p>
        <p className="insight-overview-metric-note">
          左对齐并排对比样本中的人群规模与车辆规模，直接看出谁更多、差多少。
        </p>
      </div>

      <div className="insight-overview-scale-bars" aria-hidden="true">
        <div className="insight-overview-scale-bar-row">
          <div className="insight-overview-scale-bar-copy">
            <span className="insight-overview-scale-eyebrow">人群端</span>
            <p className="insight-overview-scale-copy">参与骑行的独立用户</p>
          </div>
          <div className="insight-overview-scale-bar-viz">
            <strong className="insight-overview-scale-value">{formatCount(overviewCoverageStats.riders)}</strong>
            <div className="insight-overview-scale-track">
              <span className="insight-overview-scale-fill insight-overview-scale-fill-users" style={{ width: `${(overviewCoverageStats.riders / overviewCoverageStats.bikes) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="insight-overview-scale-bar-row">
          <div className="insight-overview-scale-bar-copy">
            <span className="insight-overview-scale-eyebrow">车端</span>
            <p className="insight-overview-scale-copy">投入使用的独立单车</p>
          </div>
          <div className="insight-overview-scale-bar-viz">
            <strong className="insight-overview-scale-value">{formatCount(overviewCoverageStats.bikes)}</strong>
            <div className="insight-overview-scale-track">
              <span className="insight-overview-scale-fill insight-overview-scale-fill-bikes" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="insight-overview-scale-footer">
        <span>车端 / 人端</span>
        <strong>{ratio.toFixed(2)}x</strong>
      </div>
    </article>
  );
}

function OverviewDurationPanel() {
  const item = overviewDurationStat;

  return (
    <article className="insight-overview-metric insight-overview-metric-duration">
      <div className="insight-overview-metric-copy">
        <p className="insight-news-card-label">{item.label}</p>
        <strong className="insight-overview-metric-value">{item.value}</strong>
        <p className="insight-overview-metric-note">{item.note}</p>
      </div>
      <MetricDurationViz
        averageMinutes={item.averageMinutes}
        medianMinutes={item.medianMinutes}
        maxMinutes={item.maxMinutes}
      />
    </article>
  );
}

function InsightNewsShell({
  slug,
  label,
  meta,
  children,
}: {
  slug: InsightSlug;
  label: string;
  meta: Array<{ label: string; value: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="insight-article-shell">
      <div className="insight-article-scroll">
        <article className="insight-article" data-insight-slug={slug}>
          <header className="insight-news-topbar">
            <div className="insight-news-brandblock">
              <p className="insight-news-kicker">DIG DATA MINING DOSSIER</p>
              <h1 className="insight-news-masthead">{label}</h1>
            </div>
            <div className="insight-news-meta-list" aria-label="Overview edition metadata">
              {meta.map((item) => (
                <div key={item.label} className="insight-news-meta-item">
                  <span className="insight-news-meta-label">{item.label}</span>
                  <span className="insight-news-meta-value">{item.value}</span>
                </div>
              ))}
            </div>
          </header>

          {children}
        </article>
      </div>
    </div>
  );
}

function OverviewArticle({ isActivated }: { isActivated: boolean }) {
  return (
    <InsightNewsShell slug="insight-01" label="项目总览" meta={overviewMeta}>
      <section className="insight-overview-summary">
        <div className="insight-overview-summary-copy">
          <p className="insight-news-section-tag">Front Page / Summary</p>
          <div className="insight-overview-summary-sentence" aria-label="这是一份关于上海共享单车使用规律的城市短途出行的样本切片">
            <span>这是一份关于上海</span>
            <span>共享单车使用规律的</span>
            <span>城市短途出行的</span>
            <span>样本切片</span>
          </div>
        </div>
        <aside className="insight-overview-summary-points" aria-label="Summary highlights">
          <p className="insight-news-section-tag">Key Traits</p>
          <span>工作日双峰明显</span>
          <span>平均 16.49 分钟</span>
          <span>热点集中在核心城区</span>
        </aside>
        <OverviewBikeFigure play={isActivated} />
      </section>

      <section className="insight-overview-metrics" aria-label="Key metrics">
        <OverviewOrderQualityPanel />
        <OverviewCoveragePanel />
        <OverviewDurationPanel />
      </section>

      <section className="insight-news-two-column">
        <div className="insight-news-column insight-news-story">
          <p className="insight-news-section-tag">Lead Story</p>
          <p className="insight-news-dropcap">
            上海共享单车的使用并不是平均铺开的，而是高度受城市节奏驱动。工作日高峰清晰，骑行时长集中在 5 到
            20 分钟，热点区域集中在核心城区，这些特征共同指向一个很明确的结论：共享单车承担的是地铁站、办公区、
            商业区与居住区之间的短途接驳角色。
          </p>
          <p className="insight-news-body">
            从数据质量看，原始样本为 102,361 条记录，清洗后保留 102,210 条有效订单，仅剔除 151 条异常记录。异常值占比很低，
            说明这份样本适合被用来讨论真实的城市骑行行为，而不是被噪声牵着走。
          </p>
        </div>

        <aside className="insight-news-column insight-news-signal-strip" aria-label="Fast signals">
          {overviewSignals.map((item) => (
            <div key={item.label} className="insight-news-signal-item">
              <span className="insight-news-card-label">{item.label}</span>
              <strong className="insight-news-signal-value">{item.value}</strong>
              <p className="insight-news-card-copy">{item.note}</p>
            </div>
          ))}
        </aside>
      </section>

      <section className="insight-news-findings-block">
        <div className="insight-news-block-heading">
          <p className="insight-news-section-tag">Three Findings</p>
          <h3 className="insight-news-subheadline">后续七个模块，都会沿着这三条主线继续展开</h3>
        </div>

        <div className="insight-news-findings-grid">
          {overviewFindings.map((item) => (
            <article key={item.index} className="insight-news-finding-card insight-news-paper-card">
              <span className="insight-news-finding-index">{item.index}</span>
              <h4 className="insight-news-finding-title">{item.title}</h4>
              <p className="insight-news-card-copy">{item.body}</p>
              <ul className="insight-news-fact-list">
                {item.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="insight-news-scope-grid">
        {overviewScope.map((item) => (
          <article key={item.label} className="insight-news-scope-card">
            <span className="insight-news-card-label">{item.label}</span>
            <strong className="insight-news-scope-value">{item.value}</strong>
            <p className="insight-news-card-copy">{item.description}</p>
          </article>
        ))}
      </section>
    </InsightNewsShell>
  );
}

function PlaceholderArticle({ slug }: { slug: InsightSlug }) {
  const title = INSIGHT_TITLES[slug];

  return (
    <InsightNewsShell
      slug={slug}
      label={title}
      meta={[
        { label: "Edition", value: "In Progress" },
        { label: "Window", value: "Black Newsprint Mode" },
        { label: "Status", value: "Content Pending" },
        { label: "Scope", value: title },
      ]}
    >
      <section className="insight-news-placeholder">
        <div className="insight-news-placeholder-card insight-news-paper-card">
          <span className="insight-news-card-label">当前状态</span>
          <h3 className="insight-news-subheadline">版面骨架已就位，内容会按模块逐块接入</h3>
          <p className="insight-news-card-copy">
            这个窗口已经切到新的黑窗报纸风模式，但具体的数据指标、图表与交互还会按模块顺序逐个补全。模块切换方式保持不变：
            关闭当前黑窗，回到首页最终态后再打开其它色块。
          </p>
        </div>
      </section>
    </InsightNewsShell>
  );
}

export function InsightArticleContent({ slug, isActivated = true }: { slug: InsightSlug; isActivated?: boolean }) {
  if (slug === "insight-01") {
    return <OverviewArticle isActivated={isActivated} />;
  }

  return <PlaceholderArticle slug={slug} />;
}
