import { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";

/* ---------- sample data: replace with your own / API ---------- */
const HEIGHT_CM = 172;
const WEEK = [
  { d: "Mon", m: 45 }, { d: "Tue", m: 30 }, { d: "Wed", m: 60 },
  { d: "Thu", m: 0 }, { d: "Fri", m: 50 }, { d: "Sat", m: 75 }, { d: "Sun", m: 0 },
];
const WEEK_GOAL = 6;
const STREAK = 6;
const WEIGHTS = [72.4, 72.0, 71.6, 71.8, 71.1, 70.7, 70.2];
const WATER_GOAL = 8;
const PLAN = [
  { id: "warmup", title: "Warm-up & mobility", min: 10 },
  { id: "strength", title: "Upper body strength", min: 30 },
  { id: "core", title: "Core circuit", min: 15 },
  { id: "cardio", title: "Light cardio", min: 15 },
  { id: "stretch", title: "Cool-down stretch", min: 10 },
];
const MEALS = [
  { icon: "🌅", time: "07:00 AM", name: "Breakfast", food: "Oats, milk, one fruit", kcal: 380 },
  { icon: "☀️", time: "01:00 PM", name: "Lunch", food: "Chapati, dal, vegetables, curd", kcal: 620 },
  { icon: "🍎", time: "05:00 PM", name: "Evening snack", food: "Roasted chana, fruit", kcal: 180 },
  { icon: "🌙", time: "08:00 PM", name: "Dinner", food: "Chapati, paneer, salad", kcal: 520 },
];

/* ---------- helpers ---------- */

/* reads the data saved by the Progress Tracker page (if the user has set it up) */
function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem("fb-progress"));
    if (d && d.profile && Array.isArray(d.entries) && d.entries.length) {
      const sorted = [...d.entries].sort((a, b) => a.date.localeCompare(b.date));
      return { height: d.profile.height, weights: sorted.slice(-7).map((e) => e.weight) };
    }
  } catch { /* ignore */ }
  return null;
}

/* avatar chosen on the Profile page (photo or emoji) */
function loadAvatar() {
  try {
    const p = JSON.parse(localStorage.getItem("fb-profile"));
    if (p && p.avatar && p.avatar.type !== "none") return p.avatar;
  } catch { /* ignore */ }
  return null;
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

function smoothPath(pts) {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], cx = (a.x + b.x) / 2;
    d += ` C${cx},${a.y} ${cx},${b.y} ${b.x},${b.y}`;
  }
  return d;
}

function bmiCategory(v) {
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Healthy range";
  if (v < 30) return "Overweight";
  return "Obesity range";
}

function Stat({ icon, label, value, unit, sub, delay }) {
  const v = useCountUp(value);
  return (
    <div className="fb-card fb-stat" style={{ animationDelay: `${delay}s` }}>
      <div className="fb-stat-icon">{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{Math.round(v).toLocaleString()}<em>{unit}</em></strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}

/* ---------- component ---------- */
export default function Dashboard({
  user = "Friend",
  onLogout,
  onHome,
  onOpenTracker,
  onOpenProgress,
  onOpenNutrition,
  onOpenProfile,
  onOpenAI
}) {
  const today = new Date().toLocaleDateString("en-CA");

  const [done, setDone] = useStored(`fb-plan-${today}`, []);
  const [water, setWater] = useStored(`fb-water-${today}`, 0);

  const toggle = (id) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  const doneMin = PLAN.filter((p) => done.includes(p.id)).reduce((a, p) => a + p.min, 0);
  const totalMin = PLAN.reduce((a, p) => a + p.min, 0);
  const kcalBurned = Math.round(doneMin * 7.5);
  const planPct = Math.round((done.length / PLAN.length) * 100);

  const weekDays = WEEK.filter((w) => w.m > 0).length;
  const weekMin = WEEK.reduce((a, w) => a + w.m, 0);
  const maxMin = Math.max(...WEEK.map((w) => w.m));
  const goalPct = Math.min(1, weekDays / WEEK_GOAL);

  const R = 52;
  const C = 2 * Math.PI * R;

  // real data from the Progress Tracker if available, otherwise the sample numbers
  const real = useMemo(loadProgress, []);
  const avatar = useMemo(loadAvatar, []);
  const baseWeights = real ? real.weights : WEIGHTS;
  const weights = baseWeights.length > 1 ? baseWeights : [baseWeights[0], baseWeights[0]];
  const heightCm = real ? real.height : HEIGHT_CM;

  const weight = weights[weights.length - 1];
  const bmi = weight / (heightCm / 100) ** 2;
  const diff = weight - weights[0];
  const diffText = `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${Math.abs(diff).toFixed(1)}`;

  const W = 300, H = 110;
  const minW = Math.min(...weights), maxW = Math.max(...weights);
  const pts = weights.map((v, i) => ({
    x: (i / (weights.length - 1)) * W,
    y: 10 + (1 - (v - minW) / (maxW - minW || 1)) * (H - 20),
  }));
  const line = smoothPath(pts);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const mealKcal = MEALS.reduce((a, m) => a + m.kcal, 0);

  return (
    <div className="fb-dash">
      <header className="fb-top">
        <div className="fb-brand">
          <span className="fb-mark">F</span>
          <span>FIT<span className="fb-light">BRO.</span></span>
        </div>
        <div className="fb-top-actions">
          {onOpenAI && (
  <button className="fb-ghost fb-accent" onClick={onOpenAI}>
    🤖 FIT BRO AI
  </button>
)}
          {onOpenTracker && <button className="fb-ghost fb-accent" onClick={onOpenTracker}>🏋️ WORKOUT TRACKER</button>}
          {onOpenProfile && <button className="fb-ghost fb-accent" onClick={onOpenProfile}>👤 PROFILE</button>}
          {onOpenNutrition && <button className="fb-ghost fb-accent" onClick={onOpenNutrition}>🥗 NUTRITION</button>}
          {onOpenProgress && <button className="fb-ghost fb-accent" onClick={onOpenProgress}>📈 PROGRESS</button>}
          {onHome && <button className="fb-ghost" onClick={onHome}>← SITE</button>}
          {onLogout && <button className="fb-ghost" onClick={onLogout}>LOG OUT</button>}
          <button className="fb-avatar" title="My profile" onClick={onOpenProfile} disabled={!onOpenProfile}>
            {avatar && avatar.type === "photo" ? <img src={avatar.value} alt="" />
              : avatar && avatar.type === "emoji" ? avatar.value
              : user.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="fb-wrap">
        <div className="fb-hello">
          <div className="fb-kicker"><i /> DASHBOARD / TODAY</div>
          <h1>{greet}, <span>{user}.</span></h1>
          <p>Small steps today. Stronger tomorrow.</p>
        </div>

        {/* stats */}
        <section className="fb-stats">
          <Stat icon="🔥" label="CALORIES BURNED" value={kcalBurned} unit=" kcal" sub="from today's plan" delay={0} />
          <Stat icon="⏱️" label="ACTIVE THIS WEEK" value={weekMin} unit=" min" sub={`${weekDays} workout days`} delay={0.08} />
          <Stat icon="⚡" label="CURRENT STREAK" value={STREAK} unit=" days" sub="keep it going" delay={0.16} />
          <Stat icon="💧" label="WATER" value={water} unit={` / ${WATER_GOAL}`} sub="glasses today" delay={0.24} />
        </section>

        <section className="fb-grid">
          {/* weekly activity */}
          <div className="fb-card fb-activity">
            <div className="fb-head">
              <h3>Weekly activity</h3>
              <span>MINUTES / DAY</span>
            </div>
            <div className="fb-bars">
              {WEEK.map((w, i) => (
                <div className="fb-bar-col" key={w.d}>
                  <div className="fb-bar-track">
                    <div
                      className={`fb-bar${w.m === 0 ? " zero" : ""}`}
                      style={{ height: `${w.m === 0 ? 4 : (w.m / maxMin) * 100}%`, animationDelay: `${i * 0.07}s` }}
                    >
                      <b>{w.m}</b>
                    </div>
                  </div>
                  <span>{w.d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* goal ring */}
          <div className="fb-card fb-goal">
            <div className="fb-head"><h3>Weekly goal</h3><span>{WEEK_GOAL} DAYS</span></div>
            <div className="fb-ring">
              <svg viewBox="0 0 130 130">
                <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" />
                <circle
                  cx="65" cy="65" r={R} fill="none" stroke="#c7f36b" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${goalPct * C} ${C}`} transform="rotate(-90 65 65)" className="fb-ring-fill"
                />
              </svg>
              <div className="fb-ring-text">
                <strong>{weekDays}<em>/{WEEK_GOAL}</em></strong>
                <span>workouts</span>
              </div>
            </div>
            <p className="fb-note">
              {weekDays >= WEEK_GOAL ? "Goal reached. Great work!" : `${WEEK_GOAL - weekDays} more ${WEEK_GOAL - weekDays === 1 ? "day" : "days"} to hit your goal.`}
            </p>
          </div>

          {/* today's plan */}
          <div className="fb-card fb-plan">
            <div className="fb-head">
              <h3>Today's workout</h3>
              <span>{doneMin} / {totalMin} MIN</span>
            </div>
            <div className="fb-progress"><div style={{ width: `${planPct}%` }} /></div>
            <ul>
              {PLAN.map((p) => {
                const on = done.includes(p.id);
                return (
                  <li key={p.id} className={on ? "on" : ""} onClick={() => toggle(p.id)}>
                    <span className="fb-check">{on ? "✓" : ""}</span>
                    <span className="fb-plan-title">{p.title}</span>
                    <small>{p.min} min</small>
                  </li>
                );
              })}
            </ul>
            {onOpenTracker && (
              <button className="fb-start" onClick={onOpenTracker}>START A TRACKED WORKOUT ↗</button>
            )}
          </div>

          {/* body stats */}
          <div className="fb-card fb-body">
            <div className="fb-head"><h3>Body stats</h3><span>LAST 7 WEIGHINS</span></div>
            <div className="fb-body-top">
              <div><small>WEIGHT</small><strong>{weight} <em>kg</em></strong></div>
              <div><small>BMI</small><strong>{bmi.toFixed(1)}</strong></div>
              <div><small>CHANGE</small><strong className="fb-lime">{diffText} <em>kg</em></strong></div>
            </div>
            <div className="fb-chip">{bmiCategory(bmi)}</div>
            {onOpenProgress && (
              <button className="fb-linkbtn" onClick={onOpenProgress}>VIEW FULL PROGRESS ↗</button>
            )}
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="fb-line">
              <defs>
                <linearGradient id="fb-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c7f36b" stopOpacity=".3" />
                  <stop offset="100%" stopColor="#c7f36b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#fb-area)" />
              <path d={line} fill="none" stroke="#c7f36b" strokeWidth="2.5" vectorEffect="non-scaling-stroke" className="fb-draw" />
            </svg>
          </div>

          {/* water */}
          <div className="fb-card fb-water">
            <div className="fb-head"><h3>Hydration</h3><span>{water} / {WATER_GOAL} GLASSES</span></div>
            <div className="fb-glasses">
              {Array.from({ length: WATER_GOAL }, (_, i) => (
                <button
                  key={i}
                  className={i < water ? "full" : ""}
                  onClick={() => setWater(i + 1 === water ? i : i + 1)}
                  aria-label={`Glass ${i + 1}`}
                >
                  💧
                </button>
              ))}
            </div>
            <div className="fb-water-actions">
              <button onClick={() => setWater((w) => Math.max(0, w - 1))}>− 1</button>
              <button onClick={() => setWater((w) => Math.min(WATER_GOAL, w + 1))}>+ 1 GLASS</button>
            </div>
          </div>

          {/* meals */}
          <div className="fb-card fb-meals">
            <div className="fb-head"><h3>Today's meals</h3><span>{mealKcal} KCAL</span></div>
            {onOpenNutrition && (
              <button className="fb-linkbtn" style={{ margin: "-6px 0 10px" }} onClick={onOpenNutrition}>
                OPEN NUTRITION TRACKER ↗
              </button>
            )}
            <ul>
              {MEALS.map((m) => (
                <li key={m.name}>
                  <span className="fb-meal-ico">{m.icon}</span>
                  <div>
                    <b>{m.name}</b>
                    <p>{m.food}</p>
                  </div>
                  <div className="fb-meal-r">
                    <small>{m.time}</small>
                    <span>{m.kcal} kcal</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}