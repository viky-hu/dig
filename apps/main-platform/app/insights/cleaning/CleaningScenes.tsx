import { ArrowDown, ArrowRight, Check, FileSpreadsheet, Braces } from "lucide-react";
import { COORD_REJECTS, FEATURES, OUTPUT_FIELDS, RAW_FIELDS, SAMPLE, SAMPLE_ROWS } from "./data";

function RecordTag({ id = "78387" }: { id?: string }) {
  return <span className="cl-record-tag">ORDER <b>{id}</b></span>;
}

function LoadScene() {
  return (
    <div className="cl-scene cl-load-scene">
      <div className="cl-file-source">
        <FileSpreadsheet size={30} strokeWidth={1.3} />
        <div><span>原始数据集</span><strong>mobike_shanghai_sample_updated.csv</strong></div>
        <span className="cl-file-extension">CSV</span>
      </div>
      <div className="cl-load-connector" aria-hidden="true">
        <svg viewBox="0 0 660 62" preserveAspectRatio="none"><path data-draw d="M330 0V22Q330 34 318 34H40Q28 34 28 46V62M330 34H620Q632 34 632 46V62" /></svg>
        <span data-reveal="load-badge">pd.read_csv</span>
      </div>
      <div className="cl-table-window">
        <div className="cl-table-heading"><span>订单记录节选</span><span>4 / 102,361 行</span></div>
        <table className="cl-record-table">
          <thead><tr><th>orderid</th><th>start_time</th><th>start_location_x</th><th>end_time</th></tr></thead>
          <tbody>
            {SAMPLE_ROWS.map((r, i) => <tr key={r[0]} data-record-row className={i === 0 ? "is-selected" : ""}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{["2016/8/20 7:04", "2016/8/29 19:31", "2016/8/13 16:36", "2016/8/8 15:28"][i]}</td></tr>)}
          </tbody>
        </table>
        <div className="cl-table-footer"><span>其余字段：bikeid、userid、起点纬度、终点经纬度</span><span>共 9 列</span></div>
      </div>
      <div className="cl-schema-summary" data-reveal="load-summary">
        <span><b>03</b> 标识字段</span><span><b>02</b> 时间字段</span><span><b>04</b> 坐标字段</span>
      </div>
      <div className="cl-scene-caption"><RecordTag /><span>这条真实订单将贯穿后续时间处理。</span></div>
    </div>
  );
}

function InspectScene() {
  return (
    <div className="cl-scene cl-inspect-scene">
      <div className="cl-inspect-field-grid">
        {RAW_FIELDS.map((name, i) => <div key={name} data-inspect-field><span>{name}</span><b data-field-type>{i < 3 ? "int64" : name.includes("time") ? "str" : "float64"}</b><Check size={13} data-field-check aria-hidden="true" /></div>)}
        <div className="cl-inspect-scan" data-inspect-scan aria-hidden="true" />
      </div>
      <div className="cl-quality-results">
        <div data-reveal="missing"><span>缺失单元格</span><strong>0<Check size={26} /></strong><code>df.isnull().sum()</code></div>
        <div data-reveal="duplicate"><span>重复记录</span><strong>0<Check size={26} /></strong><code>df.duplicated().sum()</code></div>
      </div>
      <div className="cl-scene-caption"><span className="cl-semantic-dot" /><span>检查通过，所有记录原样保留。</span></div>
    </div>
  );
}

function TimeScene() {
  return (
    <div className="cl-scene cl-time-scene">
      <div className="cl-sample-heading"><RecordTag /><span>类型转换 / str → datetime</span></div>
      {[{ field: "start_time", raw: SAMPLE.start_time, time: "06:57", kind: "start" }, { field: "end_time", raw: SAMPLE.end_time, time: "07:04", kind: "end" }].map(t => (
        <div className="cl-time-row" key={t.kind}>
          <div className="cl-time-input"><code>{t.field}</code><strong>{t.raw}</strong><span>原始字符串</span></div>
          <div className="cl-time-arrow"><svg viewBox="0 0 80 40" aria-hidden="true"><path data-draw d="M0 20H76M67 12L76 20L67 28" /></svg></div>
          <div className="cl-time-output" data-reveal={`time-${t.kind}`}><span>2016-08-20</span><strong>{t.time}</strong><code>datetime</code></div>
        </div>
      ))}
      <div className="cl-time-coverage" data-reveal="time-coverage"><span>出发时间覆盖</span><strong>08.01 <span>00:23</span><ArrowRight size={17} />08.31 <span>23:58</span></strong><span>2016 年 8 月</span></div>
    </div>
  );
}

function FeaturesScene() {
  return (
    <div className="cl-scene cl-features-scene">
      <div className="cl-feature-source"><RecordTag /><code>start_time</code><strong>2016-08-20 <span>06:57</span></strong></div>
      <svg className="cl-feature-branches" viewBox="0 0 660 64" preserveAspectRatio="none" aria-hidden="true">
        {[82.5,247.5,412.5,577.5].map((x,i) => <path data-feature-path={i} key={x} d={`M330 0V16Q330 28 ${x < 330 ? 318 : 342} 28H${x}V64`} />)}
      </svg>
      <div className="cl-features-grid">
        {FEATURES.map((f, i) => <div className="cl-derived-field" data-derived-field={i} key={f.name}><code>{f.name}</code><strong>{f.value}</strong><span>{f.label}</span></div>)}
      </div>
      <div className="cl-week-summary" data-reveal="week-summary"><div><span>工作日</span><b>76,160</b></div><div><span>周末</span><b>26,201</b></div><p>过滤前的全量统计 · 不改变记录数量</p></div>
    </div>
  );
}

function DurationScene() {
  return (
    <div className="cl-scene cl-duration-scene">
      <div className="cl-sample-heading"><RecordTag /><span>时长 =（到达 − 出发）÷ 60 秒</span></div>
      <div className="cl-duration-equation"><div><span>出发</span><strong>06:57</strong></div><ArrowRight className="cl-duration-arrow" size={36} strokeWidth={1} /><div><span>到达</span><strong>07:04</strong></div><span className="cl-equals">=</span><div className="cl-duration-answer" data-reveal="duration-answer"><strong>7<small>min</small></strong><code>duration_min</code></div></div>
      <div className="cl-duration-line"><svg viewBox="0 0 660 50" preserveAspectRatio="none" aria-hidden="true"><path data-draw d="M8 5V25H652V5M8 19V31M100 19V31M192 19V31M284 19V31M376 19V31M468 19V31M560 19V31M652 19V31" /></svg><div><span>0</span><span>7 分钟</span></div></div>
      <div className="cl-duration-tail" data-reveal="duration-tail"><div><span className="cl-small-label">原始最大时长</span><strong>4,725<small>min</small></strong><RecordTag id="119909" /></div><div className="cl-tail-detail"><span>2016-08-05 08:43</span><ArrowDown size={18} /><span>2016-08-08 15:28</span><p>超长记录已被看见。<br />下一步才决定是否剔除。</p></div><div className="cl-tail-trace" aria-hidden="true"><span /><span /><span /><b>…</b></div></div>
    </div>
  );
}

function CoordinatePlot() {
  return <div className="cl-coordinate-plot" data-reveal="coordinate-plot">
    <div className="cl-chart-label"><span>起终点坐标检查</span><b>3 条越界</b></div>
    <svg viewBox="0 0 360 154" role="img" aria-label="有效经度范围为120.8至122.2，有效纬度范围为30.7至31.9，三条异常订单的终点均在西侧范围外">
      <path className="cl-coordinate-axis" d="M30 12V134H342" />
      <rect className="cl-valid-bounds" x="101" y="24" width="224" height="98" />
      <text x="101" y="146">120.8</text><text x="296" y="146">122.2</text><text x="4" y="29">31.9</text><text x="4" y="124">30.7</text>
      <text className="cl-bounds-label" x="211" y="50" textAnchor="middle">坐标有效范围</text>
      {[[182,79],[207,89],[194,93],[203,81],[185,85],[213,90],[197,88],[201,77],[186,96],[209,95]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="2.7" className="cl-coordinate-valid" />)}
      <path className="cl-coordinate-reject-link" data-draw d="M194 85L50 60M206 89L50 65M198 78L50 70" />
      {[60,65,70].map(y => <circle key={y} cx="50" cy={y} r="3" className="cl-coordinate-invalid" />)}
      <text x="34" y="98" className="cl-coordinate-invalid">≈120.487</text>
    </svg>
    <p>经度 [120.8, 122.2] · 纬度 [30.7, 31.9]</p>
  </div>;
}

function FilterScene({ phase }: { phase: number }) {
  const rules = [
    { title: "不足 1 分钟", condition: "< 1 min", count: "0", note: "通过" },
    { title: "超过 180 分钟", condition: "> 180 min", count: "148", note: "剔除" },
    { title: "坐标越界", condition: "bounds", count: "3", note: "剔除" },
    { title: "复核负时长", condition: "< 0 min", count: "0", note: "通过" },
  ];
  return <div className="cl-scene cl-filter-scene">
    <div className="cl-rule-grid">{rules.map((r,i) => <div className={`cl-rule ${i === 1 || i === 2 ? "cl-rule--reject" : ""}`} data-active={phase === i} key={r.title}><span>0{i+1} / {r.title}</span><code>{r.condition}</code><strong data-gate-result={i}>{r.count}<small>{r.note}</small></strong></div>)}</div>
    <div className="cl-flow-diagram">
      <svg viewBox="0 0 660 110" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path className="cl-flow-guide" data-route="accept" d="M16 24H644" />
        <path className="cl-flow-guide cl-flow-guide--reject" data-route="long" d="M16 24H190Q212 24 212 46V70Q212 88 230 88H300" />
        <path className="cl-flow-guide cl-flow-guide--reject" data-route="coord" d="M16 24H382Q404 24 404 46V70Q404 88 422 88H482" />
        {[0,1,2,3,4,5].map(i => <rect key={i} data-flow-particle="accept" x="-5" y="-5" width="10" height="10" rx="1" />)}
        {[0,1,2].map(i => <rect key={i} data-flow-particle="long" x="-5" y="-5" width="10" height="10" rx="1" />)}
        {[0,1,2].map(i => <rect key={i} data-flow-particle="coord" x="-5" y="-5" width="10" height="10" rx="1" />)}
        <path className="cl-flow-arrow" d="M634 17L644 24L634 31" />
      </svg>
      <span className="cl-flow-start">原始订单</span><span className="cl-flow-finish">保留记录</span>
      <span className="cl-flow-reject cl-flow-reject--long" data-reveal="long-receipt">148 条超长</span><span className="cl-flow-reject cl-flow-reject--coord" data-reveal="coord-receipt">3 条越界</span>
    </div>
    <div className="cl-filter-evidence"><CoordinatePlot /><div className="cl-reject-ledger" data-reveal="reject-ledger"><div className="cl-chart-label"><span>真实异常订单</span><b>终点经度</b></div>{COORD_REJECTS.map(r => <div key={r.id}><span>#{r.id}</span><strong>{r.lng.toFixed(3)}</strong><small>{r.duration} min</small></div>)}<p>三个终点落在西侧范围外。<br />负时长被第一道规则涵盖，末次复核新增剔除为 0。</p></div></div>
  </div>;
}

function ExportScene() {
  const inputOrder = [...RAW_FIELDS, "start_date", "start_hour", "start_weekday", "start_is_weekend", "duration_min"];
  return <div className="cl-scene cl-export-scene">
    <div className="cl-output-heading"><div className="cl-output-file-icon"><FileSpreadsheet size={34} strokeWidth={1.2} /></div><div><span className="cl-small-label">清洗结果</span><h3>cleaned_mobike.csv</h3><span>UTF-8 · index=False</span></div><Check className="cl-output-check" size={27} data-reveal="output-check" /></div>
    <div className="cl-output-field-label"><Braces size={15} /><span>按脚本指定顺序排列 14 个字段</span></div>
    <div className="cl-output-fields">{inputOrder.map(name => <span key={name} data-output-field data-output-order={OUTPUT_FIELDS.indexOf(name as typeof OUTPUT_FIELDS[number])} className={RAW_FIELDS.includes(name as typeof RAW_FIELDS[number]) ? "" : "is-derived"}>{name}</span>)}</div>
    <div className="cl-output-result" data-reveal="output-result"><div><strong>102,210</strong><span>有效订单</span></div><div><strong>99.85<small>%</small></strong><span>保留率</span></div></div>
    <div className="cl-output-handoff" data-reveal="output-handoff"><span>为后续分析准备就绪</span><div><span>时间规律</span><span>空间聚类</span><span>区域流向</span></div></div>
  </div>;
}

export function CleaningScenes({ step, phase }: { step: number; phase: number }) {
  switch (step) {
    case 0: return <LoadScene />;
    case 1: return <InspectScene />;
    case 2: return <TimeScene />;
    case 3: return <FeaturesScene />;
    case 4: return <DurationScene />;
    case 5: return <FilterScene phase={phase} />;
    default: return <ExportScene />;
  }
}
