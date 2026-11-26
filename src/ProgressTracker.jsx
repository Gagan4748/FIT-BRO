import { useEffect, useRef, useState } from "react";
import "./ProgressTracker.css";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */
const todayStr = () => new Date().toLocaleDateString("en-CA");
const parseDate = (s) => new Date(`${s}T00:00:00`);
const shortDate = (s) => parseDate(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const longDate = (s) => parseDate(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const bmiOf = (kg, cm) => kg / (cm / 100) ** 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function bmiInfo(v) {
  if (v < 18.5) return { label: "Underweight", cls: "under" };
  if (v < 25) return { label: "Healthy range", cls: "ok" };
  if (v < 30) return { label: "Overweight", cls: "over" };
  return { label: "Obesity range", cls: "obese" };
}

function mondayOf(dateStr) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString("en-CA");
}

/* daily = one point per entry (last 30), weekly = average per week (last 12) */
function buildSeries(entries, mode) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (mode === "daily") {
    return sorted.slice(-30).map((e) => ({ label: shortDate(e.date), value: e.weight }));
  }
  const weeks = new Map();
  sorted.forEach((e) => {
    const k = mondayOf(e.date);
    const g = weeks.get(k) || { sum: 0, n: 0 };
    g.sum += e.weight;
    g.n += 1;
    weeks.set(k, g);
  });
  return [...weeks.entries()].slice(-12).map(([k, g]) => ({
    label: `Wk ${shortDate(k)}`,
    value: Number((g.sum / g.n).toFixed(1)),
  }));
}

function smooth(pts) {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], cx = (a.x + b.x) / 2;
    d += ` C${cx},${a.y} ${cx},${b.y} ${b.x},${b.y}`;
  }
  return d;
}

function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

function useCountUp(target, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/* ------------------------------------------------------------------ */
/*  profile form (first-time setup + edit goals)                       */
/* ------------------------------------------------------------------ */
function ProfileForm({ initial, onSave, onCancel, isSetup }) {
  const [height, setHeight] = useState(initial ? String(initial.height) : "");
  const [start, setStart] = useState(initial ? String(initial.start) : "");
  const [goal, setGoal] = useState(initial ? String(initial.goal) : "");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const h = Number(height), s = Number(start), g = Number(goal);
    if (!h || h < 80 || h > 250) return setError("Enter a height between 80 and 250 cm.");
    if (!s || s < 20 || s > 350) return setError("Enter a starting weight between 20 and 350 kg.");
    if (!g || g < 20 || g > 350) return setError("Enter a goal weight between 20 and 350 kg.");
    onSave({ height: h, start: s, goal: g });
  };

  return (
    <form className="pt-card pt-profile" onSubmit={submit}>
      <h3>{isSetup ? "Set up your goal" : "Edit your goals"}</h3>
      <p className="pt-muted">
        {isSetup
          ? "Tell us where you are now and where you want to be. You can change this any time."
          : "Update your height, starting weight or goal weight."}
      </p>

      <div className="pt-fields">
        <label>HEIGHT (CM)
          <input type="number" step="0.1" min="80" max="250" placeholder="e.g. 172" value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <label>STARTING WEIGHT (KG)
          <input type="number" step="0.1" min="20" max="350" placeholder="e.g. 75" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>GOAL WEIGHT (KG)
          <input type="number" step="0.1" min="20" max="350" placeholder="e.g. 68" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
      </div>

      {error && <p className="pt-error">{error}</p>}

      <div className="pt-actions">
        {onCancel && <button type="button" className="pt-ghost" onClick={onCancel}>CANCEL</button>}
        <button type="submit" className="pt-primary">{isSetup ? "START TRACKING ↗" : "SAVE CHANGES"}</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  main component                                                     */
/* ------------------------------------------------------------------ */
export default function ProgressTracker({ onBack }) {
  const [data, setData] = useStored("fb-progress", { profile: null, entries: [] });
  const { profile, entries } = data;

  const [mode, setMode] = useState("daily");
  const [hover, setHover] = useState(null);
  const [editing, setEditing] = useState(false);

  const [date, setDate] = useState(todayStr());
  const [weightInput, setWeightInput] = useState("");
  const [logMsg, setLogMsg] = useState("");
  const [logError, setLogError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const boxRef = useRef(null);

  /* ----- first-time setup ----- */
  const saveProfile = (p) => {
    setData((d) => ({
      profile: p,
      entries: d.entries.length ? d.entries : [{ id: `e${Date.now()}`, date: todayStr(), weight: p.start }],
    }));
    setEditing(false);
  };

  /* ----- log weight ----- */
  const logWeight = (e) => {
    e.preventDefault();
    const w = Number(weightInput);
    setLogMsg("");
    if (!w || w < 20 || w > 350) return setLogError("Enter a weight between 20 and 350 kg.");
    if (!date) return setLogError("Pick a date.");
    setLogError("");
    setData((d) => ({
      ...d,
      entries: [...d.entries.filter((x) => x.date !== date), { id: `e${Date.now()}`, date, weight: w }],
    }));
    setWeightInput("");
    setLogMsg(`Saved ${w} kg for ${longDate(date)} ✓`);
  };

  const deleteEntry = (id) => {
    if (window.confirm("Delete this entry?")) {
      setData((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== id) }));
    }
  };

  const resetAll = () => {
    if (window.confirm("Reset your goal and delete ALL weight entries?")) {
      setData({ profile: null, entries: [] });
      setEditing(false);
    }
  };

  /* ----- derived numbers (safe even before setup) ----- */
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const start = profile ? profile.start : 0;
  const goal = profile ? profile.goal : 0;
  const current = latest ? latest.weight : start;
  const change = current - start;
  const totalNeeded = goal - start;
  const pct = !profile ? 0 : totalNeeded === 0 ? 100 : clamp((change / totalNeeded) * 100, 0, 100);
  const remaining = Math.abs(goal - current);
  const reached = !!profile && pct >= 100;
  const currentBmi = profile ? bmiOf(current, profile.height) : 0;
  const bmiMeta = bmiInfo(currentBmi);

  const countPct = useCountUp(pct);
  const R = 56;
  const C = 2 * Math.PI * R;

  /* ================= first-time setup screen ================= */
  if (!profile) {
    return (
      <div className="pt">
        <Header onBack={onBack} />
        <main className="pt-wrap pt-narrow">
          <Hello />
          <ProfileForm isSetup onSave={saveProfile} />
        </main>
      </div>
    );
  }

  /* ----- chart data ----- */
  const series = buildSeries(entries, mode);
  const W = 640, H = 240;
  let chart = null;
  if (series.length >= 2) {
    const vals = series.map((s) => s.value);
    const lo = Math.min(...vals, goal);
    const hi = Math.max(...vals, goal);
    const pad = (hi - lo || 1) * 0.18;
    const yMin = lo - pad, yMax = hi + pad;
    const yOf = (v) => H - ((v - yMin) / (yMax - yMin)) * H;
    const pts = series.map((s, i) => ({ x: (i / (series.length - 1)) * W, y: yOf(s.value) }));
    const line = smooth(pts);
    const step = Math.max(1, Math.ceil(series.length / 6));
    chart = {
      pts, line, area: `${line} L${W},${H} L0,${H} Z`, goalY: yOf(goal),
      ticks: [yMax, (yMax + yMin) / 2, yMin], step,
    };
  }

  const onMove = (e) => {
    if (!chart) return;
    const r = boxRef.current.getBoundingClientRect();
    const p = clamp((e.clientX - r.left) / r.width, 0, 1);
    setHover(Math.round(p * (series.length - 1)));
  };

  /* ----- bmi history ----- */
  const history = [...sorted].reverse();
  const shown = showAll ? history : history.slice(0, 6);
  const bmiPos = clamp(((currentBmi - 15) / 25) * 100, 0, 100);

  /* ================= main screen ================= */
  return (
    <div className="pt">
      <Header onBack={onBack} />

      <main className="pt-wrap">
        <Hello />

        {editing && (
          <ProfileForm initial={profile} onSave={saveProfile} onCancel={() => setEditing(false)} />
        )}

        {/* ---- summary stats ---- */}
        <section className="pt-stats">
          <div className="pt-card pt-stat" style={{ animationDelay: "0s" }}>
            <small>STARTING WEIGHT</small>
            <strong>{start}<em> kg</em></strong>
          </div>
          <div className="pt-card pt-stat" style={{ animationDelay: ".08s" }}>
            <small>CURRENT WEIGHT</small>
            <strong className="pt-lime">{current}<em> kg</em></strong>
          </div>
          <div className="pt-card pt-stat" style={{ animationDelay: ".16s" }}>
            <small>GOAL WEIGHT</small>
            <strong>{goal}<em> kg</em></strong>
          </div>
          <div className="pt-card pt-stat" style={{ animationDelay: ".24s" }}>
            <small>TOTAL CHANGE</small>
            <strong className={change === 0 ? "" : (totalNeeded < 0) === (change < 0) ? "pt-lime" : "pt-warn"}>
              {change > 0 ? "+" : change < 0 ? "−" : ""}{Math.abs(change).toFixed(1)}<em> kg</em>
            </strong>
          </div>
        </section>

        {/* ---- progress + log ---- */}
        <section className="pt-row">
          <div className="pt-card pt-progress">
            <div className="pt-head"><h3>Goal progress</h3><span>{totalNeeded < 0 ? "LOSE WEIGHT" : totalNeeded > 0 ? "GAIN WEIGHT" : "MAINTAIN"}</span></div>
            <div className="pt-ring">
              <svg viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="13" />
                <circle
                  cx="70" cy="70" r={R} fill="none" stroke="#c7f36b" strokeWidth="13" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 70 70)" className="pt-ring-fill"
                />
              </svg>
              <div className="pt-ring-text">
                <strong>{Math.round(countPct)}<em>%</em></strong>
                <span>complete</span>
              </div>
            </div>

            <div className="pt-bar"><div style={{ width: `${pct}%` }} /></div>
            <div className="pt-bar-labels"><span>{start} kg</span><span>{goal} kg</span></div>

            <p className="pt-note">
              {reached
                ? "🎉 Goal reached. Amazing work!"
                : `${remaining.toFixed(1)} kg to go. Keep showing up.`}
            </p>
          </div>

          <form className="pt-card pt-log" onSubmit={logWeight}>
            <div className="pt-head"><h3>Log your weight</h3><span>DAILY OR WEEKLY</span></div>

            <label>DATE
              <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>WEIGHT (KG)
              <input
                type="number" step="0.1" min="20" max="350" placeholder="e.g. 71.4"
                value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
              />
            </label>

            {logError && <p className="pt-error">{logError}</p>}
            {logMsg && <p className="pt-ok">{logMsg}</p>}

            <button type="submit" className="pt-primary">SAVE WEIGHT ↗</button>
            <p className="pt-muted pt-small">One entry per date. Saving again on the same date replaces it.</p>
          </form>
        </section>

        {/* ---- graph ---- */}
        <section className="pt-card pt-chart-card">
          <div className="pt-head">
            <div>
              <h3>Weight progress</h3>
              <p className="pt-muted pt-small">Dashed line = your goal ({goal} kg)</p>
            </div>
            <div className="pt-tabs">
              <button className={mode === "daily" ? "on" : ""} onClick={() => { setMode("daily"); setHover(null); }}>DAILY</button>
              <button className={mode === "weekly" ? "on" : ""} onClick={() => { setMode("weekly"); setHover(null); }}>WEEKLY</button>
            </div>
          </div>

          {chart ? (
            <>
              <div className="pt-chart-row">
                <div className="pt-yaxis">
                  {chart.ticks.map((t, i) => <span key={i}>{t.toFixed(1)}</span>)}
                </div>

                <div className="pt-chart" ref={boxRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="pt-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c7f36b" stopOpacity=".32" />
                        <stop offset="100%" stopColor="#c7f36b" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0.25, 0.5, 0.75].map((g) => (
                      <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,.06)" vectorEffect="non-scaling-stroke" />
                    ))}
                    <line x1="0" x2={W} y1={chart.goalY} y2={chart.goalY} stroke="#ffe27a" strokeDasharray="6 6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <path d={chart.area} fill="url(#pt-area)" />
                    <path d={chart.line} key={mode} fill="none" stroke="#c7f36b" strokeWidth="3" vectorEffect="non-scaling-stroke" className="pt-draw" />
                  </svg>

                  {hover !== null && chart.pts[hover] && (
                    <>
                      <div className="pt-hline" style={{ left: `${(chart.pts[hover].x / W) * 100}%` }} />
                      <div className="pt-hdot" style={{ left: `${(chart.pts[hover].x / W) * 100}%`, top: `${(chart.pts[hover].y / H) * 100}%` }} />
                      <div className="pt-tip" style={{ left: `${(chart.pts[hover].x / W) * 100}%`, top: `${(chart.pts[hover].y / H) * 100}%` }}>
                        <b>{series[hover].value} kg</b>
                        <span>{series[hover].label}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-xlabels">
                {series.map((s, i) => (
                  <span key={i}>{i % chart.step === 0 ? s.label : ""}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="pt-empty">
              <span>📈</span>
              <p>
                {mode === "weekly"
                  ? "Log weight in at least 2 different weeks to see the weekly graph."
                  : "Log at least 2 entries to see your graph."}
              </p>
            </div>
          )}
        </section>

        {/* ---- BMI history ---- */}
        <section className="pt-card pt-bmi">
          <div className="pt-head"><h3>BMI history</h3><span>HEIGHT {profile.height} CM</span></div>

          <div className="pt-bmi-now">
            <div>
              <small>CURRENT BMI</small>
              <strong>{currentBmi.toFixed(1)}</strong>
            </div>
            <span className={`pt-chip ${bmiMeta.cls}`}>{bmiMeta.label}</span>
          </div>

          <div className="pt-scale">
            <div className="pt-scale-bar">
              <i style={{ flex: 14 }} /><i style={{ flex: 26 }} /><i style={{ flex: 20 }} /><i style={{ flex: 40 }} />
              <b style={{ left: `${bmiPos}%` }} />
            </div>
            <div className="pt-scale-labels">
              <span>UNDER</span><span>HEALTHY</span><span>OVER</span><span>OBESE</span>
            </div>
          </div>

          <div className="pt-table">
            <div className="pt-tr pt-th"><span>DATE</span><span>WEIGHT</span><span>BMI</span><span>STATUS</span><span /></div>
            {shown.map((e) => {
              const b = bmiOf(e.weight, profile.height);
              const m = bmiInfo(b);
              return (
                <div className="pt-tr" key={e.id}>
                  <span>{longDate(e.date)}</span>
                  <span>{e.weight} kg</span>
                  <span className="pt-lime">{b.toFixed(1)}</span>
                  <span><i className={`pt-chip ${m.cls}`}>{m.label}</i></span>
                  <button className="pt-x" onClick={() => deleteEntry(e.id)} aria-label="Delete entry">✕</button>
                </div>
              );
            })}
          </div>

          {history.length > 6 && (
            <button className="pt-link" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "SHOW LESS" : `SHOW ALL (${history.length})`}
            </button>
          )}
        </section>

        <div className="pt-footer-actions">
          <button className="pt-ghost" onClick={() => setEditing(true)}>✎ EDIT GOALS</button>
          <button className="pt-ghost pt-danger" onClick={resetAll}>RESET ALL DATA</button>
        </div>
      </main>
    </div>
  );
}

function Header({ onBack }) {
  return (
    <header className="pt-top">
      <div className="pt-brand">
        <span className="pt-mark">F</span>
        <span>FIT<span className="pt-light">BRO.</span></span>
      </div>
      <button className="pt-ghost" onClick={onBack}>← DASHBOARD</button>
    </header>
  );
}

function Hello() {
  return (
    <div className="pt-hello">
      <div className="pt-kicker"><i /> PROGRESS TRACKER</div>
      <h1>Small changes. <span>Big results.</span></h1>
    </div>
  );
}