import { useEffect, useState } from "react";
import "./nutrition.css";


/* ------------------------------------------------------------------ */
/*  data                                                               */
/* ------------------------------------------------------------------ */
const MEALS = [
  { key: "breakfast", label: "Breakfast", icon: "🌅", time: "Morning" },
  { key: "lunch", label: "Lunch", icon: "☀️", time: "Afternoon" },
  { key: "dinner", label: "Dinner", icon: "🌙", time: "Evening" },
  { key: "snacks", label: "Snacks", icon: "🍎", time: "Anytime" },
];

/* approximate values per serving: cal = kcal, p = protein g, c = carbs g, f = fat g */
const FOODS = [
  { name: "Chapati / Roti", serving: "1 medium", cal: 120, p: 3.5, c: 20, f: 3 },
  { name: "Cooked Rice", serving: "1 cup (150 g)", cal: 200, p: 4, c: 44, f: 0.5 },
  { name: "Dal", serving: "1 bowl (150 g)", cal: 180, p: 10, c: 25, f: 4 },
  { name: "Paneer", serving: "100 g", cal: 265, p: 18, c: 3, f: 20 },
  { name: "Boiled Egg", serving: "1 egg", cal: 78, p: 6, c: 0.6, f: 5 },
  { name: "Chicken Breast (grilled)", serving: "100 g", cal: 165, p: 31, c: 0, f: 3.6 },
  { name: "Fish (grilled)", serving: "100 g", cal: 140, p: 22, c: 0, f: 5 },
  { name: "Oats", serving: "40 g dry", cal: 150, p: 5, c: 27, f: 3 },
  { name: "Milk", serving: "1 glass (250 ml)", cal: 150, p: 8, c: 12, f: 8 },
  { name: "Curd", serving: "1 bowl (150 g)", cal: 90, p: 5, c: 7, f: 4 },
  { name: "Banana", serving: "1 medium", cal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: "Apple", serving: "1 medium", cal: 95, p: 0.5, c: 25, f: 0.3 },
  { name: "Peanuts", serving: "30 g", cal: 170, p: 7, c: 5, f: 14 },
  { name: "Roasted Chana", serving: "30 g", cal: 110, p: 6, c: 18, f: 2 },
  { name: "Almonds", serving: "10 pieces", cal: 70, p: 2.5, c: 2.5, f: 6 },
  { name: "Idli", serving: "2 pieces", cal: 140, p: 4, c: 28, f: 1 },
  { name: "Dosa (plain)", serving: "1 dosa", cal: 170, p: 4, c: 29, f: 4 },
  { name: "Poha", serving: "1 plate (150 g)", cal: 250, p: 5, c: 45, f: 6 },
  { name: "Vegetable Upma", serving: "1 bowl", cal: 230, p: 6, c: 35, f: 7 },
  { name: "Mixed Veg Curry", serving: "1 bowl", cal: 120, p: 3, c: 12, f: 7 },
  { name: "Green Salad", serving: "1 bowl", cal: 40, p: 2, c: 8, f: 0.3 },
  { name: "Sprouts", serving: "1 bowl", cal: 120, p: 9, c: 20, f: 1 },
  { name: "Whole Wheat Bread", serving: "2 slices", cal: 160, p: 7, c: 28, f: 2 },
  { name: "Peanut Butter", serving: "1 tbsp", cal: 95, p: 4, c: 3, f: 8 },
  { name: "Whey Protein", serving: "1 scoop", cal: 120, p: 24, c: 3, f: 1.5 },
];

const DEFAULT_GOALS = { calories: 2000, protein: 100, carbs: 250, fat: 65 };
const MACROS = [
  { key: "p", goalKey: "protein", label: "Protein", color: "#c7f36b" },
  { key: "c", goalKey: "carbs", label: "Carbs", color: "#ffe27a" },
  { key: "f", goalKey: "fat", label: "Fats", color: "#ff9a6b" },
];

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */
const todayStr = () => new Date().toLocaleDateString("en-CA");
const parseDate = (s) => new Date(`${s}T00:00:00`);
const shiftDate = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};
const niceDate = (s) => {
  const t = todayStr();
  if (s === t) return "Today";
  if (s === shiftDate(t, -1)) return "Yesterday";
  return parseDate(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (n) => Math.round(n * 10) / 10;

const sumLogs = (list) =>
  list.reduce(
    (a, e) => ({ cal: a.cal + e.cal * e.qty, p: a.p + e.p * e.qty, c: a.c + e.c * e.qty, f: a.f + e.f * e.qty }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

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

/* ------------------------------------------------------------------ */
/*  add-food panel                                                     */
/* ------------------------------------------------------------------ */
function AddFood({ meal, recent, onAdd, onClose }) {
  const [mode, setMode] = useState("search");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const [qty, setQty] = useState("1");
  const [custom, setCustom] = useState({ name: "", cal: "", p: "", c: "", f: "" });
  const [error, setError] = useState("");

  const list = FOODS.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  const nQty = Number(qty);

  const pick = (f) => {
    setPicked(f);
    setQty(String(f.qty || 1));
    setError("");
  };

  const submitPicked = () => {
    if (!picked) return setError("Pick a food first.");
    if (!(nQty >= 0.25 && nQty <= 20)) return setError("Servings must be between 0.25 and 20.");
    onAdd({ meal, name: picked.name, serving: picked.serving, qty: nQty, cal: picked.cal, p: picked.p, c: picked.c, f: picked.f });
    onClose();
  };

  const submitCustom = (e) => {
    e.preventDefault();
    const num = (v) => (v === "" ? 0 : Number(v));
    const cal = Number(custom.cal);
    const p = num(custom.p), c = num(custom.c), f = num(custom.f);
    if (!custom.name.trim()) return setError("Enter a food name.");
    if (!(cal >= 0 && cal <= 5000) || custom.cal === "") return setError("Enter calories between 0 and 5000.");
    if ([p, c, f].some((v) => !(v >= 0 && v <= 500))) return setError("Macros must be between 0 and 500 g.");
    onAdd({ meal, name: custom.name.trim(), serving: "1 serving", qty: 1, cal, p, c, f });
    onClose();
  };

  return (
    <div className="nt-add-panel">
      <div className="nt-add-top">
        <div className="nt-seg">
          <button className={mode === "search" ? "on" : ""} onClick={() => { setMode("search"); setError(""); }}>FOOD LIST</button>
          <button className={mode === "custom" ? "on" : ""} onClick={() => { setMode("custom"); setError(""); }}>CUSTOM</button>
        </div>
        <button className="nt-x" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {mode === "search" ? (
        <>
          {recent.length > 0 && !picked && (
            <div className="nt-recent">
              <small>RECENT</small>
              <div>
                {recent.map((r) => (
                  <button key={r.name} onClick={() => pick(r)}>{r.name}</button>
                ))}
              </div>
            </div>
          )}

          <input className="nt-input" placeholder="Search foods (e.g. roti, egg, paneer)" value={q} onChange={(e) => setQ(e.target.value)} />

          <ul className="nt-foodlist">
            {list.map((f) => (
              <li key={f.name} className={picked && picked.name === f.name ? "sel" : ""} onClick={() => pick(f)}>
                <div><b>{f.name}</b><small>{f.serving}</small></div>
                <span>{f.cal} kcal</span>
              </li>
            ))}
            {list.length === 0 && <li className="nt-none">No match. Try the CUSTOM tab to add your own food.</li>}
          </ul>

          {picked && (
            <div className="nt-pick">
              <div className="nt-pick-row">
                <div>
                  <b>{picked.name}</b>
                  <small>per {picked.serving}</small>
                </div>
                <label>SERVINGS
                  <input className="nt-input" type="number" step="0.25" min="0.25" max="20" value={qty} onChange={(e) => setQty(e.target.value)} />
                </label>
              </div>
              <div className="nt-preview">
                <span><b>{Math.round(picked.cal * (nQty || 0))}</b> kcal</span>
                <span><b>{r1(picked.p * (nQty || 0))}</b> g protein</span>
                <span><b>{r1(picked.c * (nQty || 0))}</b> g carbs</span>
                <span><b>{r1(picked.f * (nQty || 0))}</b> g fat</span>
              </div>
              {error && <p className="nt-error">{error}</p>}
              <button className="nt-primary" onClick={submitPicked}>ADD TO {meal.toUpperCase()} ↗</button>
            </div>
          )}
          {!picked && error && <p className="nt-error">{error}</p>}
        </>
      ) : (
        <form className="nt-custom" onSubmit={submitCustom}>
          <label>FOOD NAME
            <input className="nt-input" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="e.g. Homemade sandwich" />
          </label>
          <div className="nt-custom-grid">
            <label>CALORIES
              <input className="nt-input" type="number" min="0" value={custom.cal} onChange={(e) => setCustom({ ...custom, cal: e.target.value })} placeholder="kcal" />
            </label>
            <label>PROTEIN (G)
              <input className="nt-input" type="number" min="0" step="0.1" value={custom.p} onChange={(e) => setCustom({ ...custom, p: e.target.value })} placeholder="0" />
            </label>
            <label>CARBS (G)
              <input className="nt-input" type="number" min="0" step="0.1" value={custom.c} onChange={(e) => setCustom({ ...custom, c: e.target.value })} placeholder="0" />
            </label>
            <label>FATS (G)
              <input className="nt-input" type="number" min="0" step="0.1" value={custom.f} onChange={(e) => setCustom({ ...custom, f: e.target.value })} placeholder="0" />
            </label>
          </div>
          {error && <p className="nt-error">{error}</p>}
          <button type="submit" className="nt-primary">ADD TO {meal.toUpperCase()} ↗</button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  main component                                                     */
/* ------------------------------------------------------------------ */
export default function NutritionTracker({ onBack }) {
  const [data, setData] = useStored("fb-nutrition", { goals: DEFAULT_GOALS, logs: [] });
  const goals = data.goals || DEFAULT_GOALS;
  const logs = data.logs || [];

  const [tab, setTab] = useState("diary");
  const [date, setDate] = useState(todayStr());
  const [adding, setAdding] = useState(null);
  const [editGoals, setEditGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState(goals);
  const [goalError, setGoalError] = useState("");
  const [openDay, setOpenDay] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  /* ----- actions ----- */
  const addEntry = (entry, forDate = date) =>
    setData((d) => ({
      ...d,
      logs: [...(d.logs || []), { ...entry, date: forDate, id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}` }],
    }));

  const deleteEntry = (id) => setData((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id) }));

  const relog = (e) => {
    const { id, date: _d, ...rest } = e; // eslint-disable-line no-unused-vars
    addEntry(rest, date);
    setNotice(`Added ${e.name} to ${niceDate(date)}`);
  };

  const saveGoals = (e) => {
    e.preventDefault();
    const g = {
      calories: Number(goalDraft.calories), protein: Number(goalDraft.protein),
      carbs: Number(goalDraft.carbs), fat: Number(goalDraft.fat),
    };
    if (!(g.calories >= 800 && g.calories <= 6000)) return setGoalError("Calories goal should be between 800 and 6000.");
    if ([g.protein, g.carbs, g.fat].some((v) => !(v >= 1 && v <= 800))) return setGoalError("Macro goals should be between 1 and 800 g.");
    setData((d) => ({ ...d, goals: g }));
    setGoalError("");
    setEditGoals(false);
  };

  /* ----- derived: selected day ----- */
  const dayLogs = logs.filter((l) => l.date === date);
  const total = sumLogs(dayLogs);
  const calPct = clamp(total.cal / goals.calories, 0, 1);
  const over = total.cal > goals.calories;
  const R = 56;
  const C = 2 * Math.PI * R;

  const macroCals = { p: total.p * 4, c: total.c * 4, f: total.f * 9 };
  const macroSum = macroCals.p + macroCals.c + macroCals.f;

  const recent = (() => {
    const seen = new Set();
    const out = [];
    [...logs].reverse().forEach((l) => {
      if (!seen.has(l.name) && out.length < 6) {
        seen.add(l.name);
        out.push({ name: l.name, serving: l.serving, qty: l.qty, cal: l.cal, p: l.p, c: l.c, f: l.f });
      }
    });
    return out;
  })();

  /* ----- derived: history ----- */
  const week = Array.from({ length: 7 }, (_, i) => shiftDate(todayStr(), i - 6));
  const weekData = week.map((d) => ({ d, cal: sumLogs(logs.filter((l) => l.date === d)).cal }));
  const weekMax = Math.max(goals.calories, ...weekData.map((w) => w.cal), 1);
  const historyDates = [...new Set(logs.map((l) => l.date))].sort().reverse().slice(0, 30);

  /* ================= render ================= */
  return (
    <div className="nt">
      <header className="nt-top">
        <div className="nt-brand">
          <span className="nt-mark">F</span>
          <span>FIT<span className="nt-light">BRO.</span></span>
        </div>
        <button className="nt-ghost" onClick={onBack}>← DASHBOARD</button>
      </header>

      <main className="nt-wrap">
        <div className="nt-hello">
          <div className="nt-kicker"><i /> NUTRITION TRACKER</div>
          <h1>Fuel well. <span>Track it.</span></h1>
        </div>

        <div className="nt-tabs">
          <button className={tab === "diary" ? "on" : ""} onClick={() => setTab("diary")}>FOOD DIARY</button>
          <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>FOOD HISTORY</button>
        </div>

        {notice && <div className="nt-notice">✓ {notice}</div>}

        {/* ======================= DIARY ======================= */}
        {tab === "diary" && (
          <>
            <div className="nt-datebar">
              <button onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
              <div className="nt-date-mid">
                <b>{niceDate(date)}</b>
                <input
                  type="date" value={date} max={todayStr()}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                />
              </div>
              <button disabled={date >= todayStr()} onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">›</button>
            </div>

            {/* ---- daily summary ---- */}
            <section className="nt-card nt-summary">
              <div className="nt-sum-head">
                <h3>Daily summary</h3>
                <button className="nt-link" onClick={() => { setGoalDraft(goals); setGoalError(""); setEditGoals((v) => !v); }}>
                  {editGoals ? "CLOSE" : "✎ EDIT GOALS"}
                </button>
              </div>

              {editGoals && (
                <form className="nt-goals" onSubmit={saveGoals}>
                  <label>CALORIES (KCAL)
                    <input className="nt-input" type="number" value={goalDraft.calories} onChange={(e) => setGoalDraft({ ...goalDraft, calories: e.target.value })} />
                  </label>
                  <label>PROTEIN (G)
                    <input className="nt-input" type="number" value={goalDraft.protein} onChange={(e) => setGoalDraft({ ...goalDraft, protein: e.target.value })} />
                  </label>
                  <label>CARBS (G)
                    <input className="nt-input" type="number" value={goalDraft.carbs} onChange={(e) => setGoalDraft({ ...goalDraft, carbs: e.target.value })} />
                  </label>
                  <label>FATS (G)
                    <input className="nt-input" type="number" value={goalDraft.fat} onChange={(e) => setGoalDraft({ ...goalDraft, fat: e.target.value })} />
                  </label>
                  {goalError && <p className="nt-error nt-span">{goalError}</p>}
                  <button type="submit" className="nt-primary nt-span">SAVE GOALS</button>
                </form>
              )}

              <div className="nt-sum-grid">
                <div className="nt-ring">
                  <svg viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="13" />
                    <circle
                      cx="70" cy="70" r={R} fill="none" strokeWidth="13" strokeLinecap="round"
                      stroke={over ? "#ff6b6b" : "#c7f36b"}
                      strokeDasharray={`${calPct * C} ${C}`} transform="rotate(-90 70 70)" className="nt-ring-fill"
                    />
                  </svg>
                  <div className="nt-ring-text">
                    <strong>{Math.round(total.cal)}</strong>
                    <span>of {goals.calories} kcal</span>
                  </div>
                </div>

                <div className="nt-macros">
                  <p className={`nt-left ${over ? "over" : ""}`}>
                    {over
                      ? `${Math.round(total.cal - goals.calories)} kcal over your goal`
                      : `${Math.round(goals.calories - total.cal)} kcal left today`}
                  </p>
                  {MACROS.map((m) => {
                    const val = total[m.key];
                    const goal = goals[m.goalKey];
                    return (
                      <div className="nt-macro" key={m.key}>
                        <div className="nt-macro-top">
                          <span><i style={{ background: m.color }} />{m.label}</span>
                          <b>{r1(val)} <em>/ {goal} g</em></b>
                        </div>
                        <div className="nt-bar"><div style={{ width: `${clamp((val / goal) * 100, 0, 100)}%`, background: m.color }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {macroSum > 0 && (
                <div className="nt-split">
                  <small>WHERE YOUR CALORIES CAME FROM</small>
                  <div className="nt-split-bar">
                    {MACROS.map((m) => (
                      <i key={m.key} style={{ flex: macroCals[m.key], background: m.color }} />
                    ))}
                  </div>
                  <div className="nt-split-legend">
                    {MACROS.map((m) => (
                      <span key={m.key}><i style={{ background: m.color }} />{m.label} {Math.round((macroCals[m.key] / macroSum) * 100)}%</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ---- meals ---- */}
            <section className="nt-meals">
              {MEALS.map((m) => {
                const items = dayLogs.filter((l) => l.meal === m.key);
                const mt = sumLogs(items);
                return (
                  <div className="nt-card nt-meal" key={m.key}>
                    <div className="nt-meal-head">
                      <div className="nt-meal-title">
                        <span>{m.icon}</span>
                        <div><h3>{m.label}</h3><small>{m.time}</small></div>
                      </div>
                      <div className="nt-meal-kcal"><b>{Math.round(mt.cal)}</b> kcal</div>
                    </div>

                    {items.length === 0 ? (
                      <p className="nt-emptyline">Nothing logged yet.</p>
                    ) : (
                      <ul className="nt-items">
                        {items.map((e) => (
                          <li key={e.id}>
                            <div className="nt-item-main">
                              <b>{e.name}</b>
                              <small>{e.qty} × {e.serving}</small>
                            </div>
                            <div className="nt-item-macros">
                              <span>P {r1(e.p * e.qty)}</span>
                              <span>C {r1(e.c * e.qty)}</span>
                              <span>F {r1(e.f * e.qty)}</span>
                            </div>
                            <b className="nt-item-kcal">{Math.round(e.cal * e.qty)}</b>
                            <button className="nt-x" onClick={() => deleteEntry(e.id)} aria-label="Remove food">✕</button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {adding === m.key ? (
                      <AddFood meal={m.label} recent={recent} onAdd={(entry) => addEntry({ ...entry, meal: m.key })} onClose={() => setAdding(null)} />
                    ) : (
                      <button className="nt-add" onClick={() => setAdding(m.key)}>+ ADD FOOD</button>
                    )}
                  </div>
                );
              })}
            </section>
          </>
        )}

        {/* ======================= HISTORY ======================= */}
        {tab === "history" && (
          <>
            <section className="nt-card">
              <div className="nt-sum-head"><h3>Last 7 days</h3><small>CALORIES / DAY</small></div>
              <div className="nt-week">
                <div className="nt-goal-line" style={{ bottom: `${(goals.calories / weekMax) * 100}%` }}><span>GOAL</span></div>
                {weekData.map((w) => (
                  <div className="nt-week-col" key={w.d}>
                    <div className="nt-week-track">
                      <div
                        className={`nt-week-bar${w.cal === 0 ? " zero" : w.cal > goals.calories ? " over" : ""}`}
                        style={{ height: `${w.cal === 0 ? 3 : (w.cal / weekMax) * 100}%` }}
                      >
                        {w.cal > 0 && <b>{Math.round(w.cal)}</b>}
                      </div>
                    </div>
                    <span>{parseDate(w.d).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  </div>
                ))}
              </div>
            </section>

            {historyDates.length === 0 ? (
              <div className="nt-card nt-empty">
                <span>🥗</span>
                <p>No food logged yet. Add your first meal in the diary.</p>
                <button className="nt-primary" onClick={() => setTab("diary")}>OPEN FOOD DIARY ↗</button>
              </div>
            ) : (
              <ul className="nt-days">
                {historyDates.map((d) => {
                  const items = logs.filter((l) => l.date === d);
                  const t = sumLogs(items);
                  const isOpen = openDay === d;
                  return (
                    <li className="nt-card nt-day" key={d}>
                      <button className="nt-day-head" onClick={() => setOpenDay(isOpen ? null : d)}>
                        <div>
                          <b>{niceDate(d)}</b>
                          <small>{items.length} {items.length === 1 ? "item" : "items"}</small>
                        </div>
                        <div className="nt-day-nums">
                          <span><b>{Math.round(t.cal)}</b> kcal</span>
                          <span>P {r1(t.p)}</span>
                          <span>C {r1(t.c)}</span>
                          <span>F {r1(t.f)}</span>
                        </div>
                        <i className={isOpen ? "open" : ""}>▾</i>
                      </button>

                      {isOpen && (
                        <div className="nt-day-body">
                          {MEALS.map((m) => {
                            const mi = items.filter((l) => l.meal === m.key);
                            if (mi.length === 0) return null;
                            return (
                              <div key={m.key} className="nt-day-meal">
                                <small>{m.icon} {m.label.toUpperCase()}</small>
                                {mi.map((e) => (
                                  <div className="nt-day-item" key={e.id}>
                                    <span>{e.name} <em>{e.qty} × {e.serving}</em></span>
                                    <b>{Math.round(e.cal * e.qty)} kcal</b>
                                    <button className="nt-mini" onClick={() => relog(e)}>LOG AGAIN</button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          <button className="nt-link" onClick={() => { setDate(d); setTab("diary"); }}>OPEN THIS DAY IN DIARY ↗</button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="nt-disclaimer">Food values are approximate. Check labels or use the CUSTOM tab for exact numbers.</p>
          </>
        )}
      </main>
    </div>
  );
}