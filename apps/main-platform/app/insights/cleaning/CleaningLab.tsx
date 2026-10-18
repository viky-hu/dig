"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ArrowLeft, ArrowRight, Check, Code2, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { CleaningScenes } from "./CleaningScenes";
import { STAGES, count } from "./data";
import { CLEANING_SOURCE } from "./source";
import { useCleaningPlayback } from "./useCleaningPlayback";
import "./cleaning-lab.css";

gsap.registerPlugin(useGSAP, ScrollToPlugin);

const STATUS_LABELS = { ready: "等待执行", running: "正在执行", paused: "已暂停", done: "本步完成" } as const;
const ENGLISH_TITLES = ["Read the source", "Inspect the quality", "Parse the time", "Extract the features", "Measure the ride", "Filter the anomalies", "Ready for analysis"];

function syntax(text: string): ReactNode {
  return text.split(/(#[^\n]*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:def|return|if|else|for|in|as|import)\b|\b\d+(?:\.\d+)?\b)/g).map((part, i) => {
    const kind = part.startsWith("#") ? "comment" : /^["']/.test(part) ? "string" : /^(def|return|if|else|for|in|as|import)$/.test(part) ? "keyword" : /^\d/.test(part) ? "number" : "plain";
    return <span className={`cl-syntax-${kind}`} key={i}>{part}</span>;
  });
}

export function CleaningLab({ isActivated }: { isActivated: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const codePane = useRef<HTMLDivElement>(null);
  const playback = useCleaningPlayback(root, isActivated);
  const { step, phase, status, busy, metrics } = playback;
  const stage = STAGES[step];
  const source = CLEANING_SOURCE[stage.key];
  const phaseDefinition = stage.phases[Math.max(0, phase)];
  const highlightIndex = phase < 0 ? -1 : source.lines.findIndex(line => line.includes(phaseDefinition.match));
  const highlightLength = step === 5 && phase === 2 ? 8 : 1;
  const note = status === "ready" ? stage.ready : status === "done" ? stage.result : phaseDefinition.note;
  const final = step === STAGES.length - 1 && status === "done";

  useGSAP(() => {
    const pane = codePane.current;
    if (!pane) return;
    if (phase < 0) { gsap.set(pane, { scrollTop: 0 }); return; }
    const line = pane.querySelector<HTMLElement>('[data-highlight="true"]');
    if (!line) return;
    const top = line.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(pane, { scrollTo: { y: Math.max(0, top - pane.clientHeight * 0.22), autoKill: true }, duration: reduced ? 0 : 0.35, overwrite: "auto", ease: "power2.out" });
  }, { scope: root, dependencies: [step, phase], revertOnUpdate: true });

  return (
    <div className="cl-lab" ref={root} data-status={status} data-step={step + 1}>
      <nav className="cl-chapters" aria-label="七步数据清洗流程">
        {STAGES.map((s, i) => <button key={s.key} type="button" aria-label={`第 ${i + 1} 步：${s.short}`} aria-current={step === i ? "step" : undefined} disabled={busy || !isActivated} onClick={() => playback.select(i)}><span>{String(i + 1).padStart(2, "0")}</span><strong>{s.short}</strong>{step === i && <span className="cl-chapter-current" aria-hidden="true" />}</button>)}
      </nav>

      <div className="cl-workbench">
        <section className="cl-stage" aria-labelledby="cl-stage-title">
          <header className="cl-stage-header">
            <div className="cl-stage-index"><span>{String(step + 1).padStart(2, "0")} <i>/ 07</i></span><span>{ENGLISH_TITLES[step]}</span></div>
            <h2 id="cl-stage-title">{stage.title}</h2>
            <p>{stage.description}</p>
          </header>
          <div className="cl-stage-canvas" key={stage.key}><CleaningScenes step={step} phase={phase} /></div>
          <div className="cl-stage-footnote"><span>真实样本示意 · 全量统计见下方</span><span>2016.08 / 上海</span></div>
        </section>

        <aside className="cl-code-panel" aria-label="当前步骤的真实 Python 源码">
          <header className="cl-code-header"><Code2 size={17} /><strong>处理依据</strong><span>PYTHON</span></header>
          <div className="cl-code-file"><span className="cl-file-dot" /><span>data_cleaning.py</span><span>L{source.startLine}</span></div>
          <div className="cl-code-scroller" ref={codePane} tabIndex={0} aria-label="源码，可滚动查看">
            <pre><code>{source.lines.map((line, i) => <span className="cl-code-line" key={`${stage.key}-${i}`} data-highlight={highlightIndex >= 0 && i >= highlightIndex && i < highlightIndex + highlightLength}><span className="cl-line-number" aria-hidden="true">{source.startLine + i}</span><span>{syntax(line) || " "}</span></span>)}</code></pre>
          </div>
          <div className="cl-code-context"><span className="cl-code-context-label">{phase < 0 ? "执行后跟随当前语句" : phaseDefinition.label}</span><p>{phase < 0 ? "源码逐字取自本项目清洗脚本。页面回放既有分析，不在浏览器中运行 Python。" : phaseDefinition.note}</p><span className="cl-code-origin">源文件 / main/data-mining/data_cleaning.py</span></div>
        </aside>
      </div>

      <footer className="cl-controlbar">
        <div className="cl-live-note" aria-live="polite" aria-atomic="true"><div className="cl-status"><span className="cl-semantic-dot" /><span>{STATUS_LABELS[status]}</span></div><p>{note}</p></div>
        <div className="cl-metrics" aria-label="当前全量数据规模"><div><span>记录</span><strong data-metric="rows">{count(metrics.rows)}</strong></div><div><span>字段</span><strong data-metric="fields">{metrics.fields.toString().padStart(2, "0")}</strong></div></div>
        <div className="cl-controls">
          <div className="cl-secondary-controls">
            <button type="button" title="上一步" aria-label="上一步" disabled={busy || step === 0 || !isActivated} onClick={playback.previous}><ArrowLeft size={17} /></button>
            <button type="button" title="重播本步" aria-label="重播本步" disabled={busy || !isActivated} onClick={playback.replay}><RotateCw size={17} /></button>
            <button type="button" title={status === "paused" ? "继续" : "暂停"} aria-label={status === "paused" ? "继续" : "暂停"} disabled={!busy || !isActivated} onClick={playback.togglePause}>{status === "paused" ? <Play size={16} /> : <Pause size={16} />}</button>
            <button type="button" title="重置全部" aria-label="重置全部" disabled={!isActivated} onClick={playback.reset}><RotateCcw size={17} /></button>
          </div>
          <button type="button" className="cl-primary" disabled={busy || final || !isActivated} onClick={playback.primary}>{final ? <Check size={16} /> : status === "done" ? <ArrowRight size={16} /> : <Play size={15} fill="currentColor" />}<span>{final ? "全部完成" : status === "running" ? "执行中" : status === "paused" ? "已暂停" : status === "done" ? "执行下一步" : "执行本步"}</span></button>
        </div>
        <div className="cl-playback-track" aria-hidden="true"><span data-playback-progress /></div>
      </footer>
    </div>
  );
}
