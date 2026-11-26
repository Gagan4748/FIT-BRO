import { useEffect, useRef, useState } from "react";
import "./workouttracker.css";

/* ---------- default routines (edit freely) ---------- */
const DEFAULT_ROUTINES = [
  {
    id: "push", name: "Push Day", focus: "Chest · Shoulders · Triceps",
    exercises: [
      { name: "Bench Press", sets: 4, reps: 8 },
      { name: "Overhead Press", sets: 3, reps: 10 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 10 },
      { name: "Tricep Pushdown", sets: 3, reps: 12 },
    ],
  },
  {
    id: "pull", name: "Pull Day", focus: "Back · Biceps",
    exercises: [
      { name: "Lat Pulldown", sets: 4, reps: 10 },
      { name: "Seated Row", sets: 3, reps: 10 },
      { name: "Face Pull", sets: 3, reps: 15 },
      { name: "Dumbbell Curl", sets: 3, reps: 12 },
    ],
  },
  {
    id: "legs", name: "Leg Day", focus: "Quads · Hamstrings · Glutes",
    exercises: [
      { name: "Squat", sets: 4, reps: 8 },
      { name: "Romanian Deadlift", sets: 3, reps: 10 },
      { name: "Leg Press", sets: 3, reps: 12 },
      { name: "Calf Raise", sets: 4, reps: 15 },
    ],
  },
  {
    id: "home", name: "Home Bodyweight", focus: "Full body · No equipment",
    exercises: [
      { name: "Push-ups", sets: 3, reps: 15 },
      { name: "Bodyweight Squats", sets: 3, reps: 20 },
      { name: "Plank (seconds)", sets: 3, reps: 40 },
      { name: "Lunges", sets: 3, reps: 12 },
    ],
  },
];

/* ---------- helpers ---------- */
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

const clock = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const niceDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
  " · " +
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const blankExercise = () => ({ name: "", sets: 3, reps: 10 });

/* ---------- component ---------- */
export default function WorkoutTracker({ onBack, startProgram }) {
  const [routines, setRoutines] = useStored("fb-routines", DEFAULT_ROUTINES);
  const [history, setHistory] = useStored("fb-history", []);
  const [active, setActive] = useStored("fb-active-workout", null);
  const [view, setView] = useState(active ? "active" : "routines");
  const [now, setNow] = useState(Date.now());

  // new-routine form
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFocus, setNewFocus] = useState("");
  const [newEx, setNewEx] = useState([blankExercise()]);
  const [formError, setFormError] = useState("");

  const running = !!active;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  /* ----- routines ----- */
  const saveRoutine = (e) => {
    e.preventDefault();
    const exercises = newEx
      .filter((x) => x.name.trim())
      .map((x) => ({ name: x.name.trim(), sets: Math.max(1, Number(x.sets) || 1), reps: Math.max(1, Number(x.reps) || 1) }));
    if (!newName.trim()) return setFormError("Give your routine a name.");
    if (exercises.length === 0) return setFormError("Add at least one exercise.");

    setRoutines((r) => [...r, { id: `r${Date.now()}`, name: newName.trim(), focus: newFocus.trim() || "Custom routine", exercises }]);
    setCreating(false);
    setNewName(""); setNewFocus(""); setNewEx([blankExercise()]); setFormError("");
  };

  const deleteRoutine = (id) => {
    if (window.confirm("Delete this routine?")) setRoutines((r) => r.filter((x) => x.id !== id));
  };

  const updateNewEx = (i, patch) => setNewEx((list) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  /* ----- active workout ----- */
  const startWorkout = (routine) => {
    if (active && !window.confirm("A workout is already in progress. Discard it and start a new one?")) return;
    setActive({
      routineName: routine.name,
      startedAt: Date.now(),
      exercises: routine.exercises.map((ex) => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: String(ex.reps), done: false })),
      })),
    });
    setNow(Date.now());
    setView("active");
  };

  // Opened from a program card: save it as a routine and start it right away
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!startProgram || autoStarted.current) return;
    autoStarted.current = true;
    setRoutines((r) =>
      r.some((x) => x.name === startProgram.name)
        ? r
        : [...r, { id: `p${Date.now()}`, name: startProgram.name, focus: startProgram.focus, exercises: startProgram.exercises }]);
    startWorkout(startProgram);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startProgram]);

  const updateSet = (ei, si, patch) =>
    setActive((a) => ({
      ...a,
      exercises: a.exercises.map((ex, i) =>
        i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) }),
    }));

  const addSet = (ei) =>
    setActive((a) => ({
      ...a,
      exercises: a.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { weight: last ? last.weight : "", reps: last ? last.reps : "10", done: false }] };
      }),
    }));

  const stats = (() => {
    if (!active) return { done: 0, total: 0, volume: 0, pct: 0 };
    let done = 0, total = 0, volume = 0;
    active.exercises.forEach((ex) =>
      ex.sets.forEach((s) => {
        total += 1;
        if (s.done) {
          done += 1;
          volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
      }));
    return { done, total, volume, pct: total ? Math.round((done / total) * 100) : 0 };
  })();

  const elapsed = active ? Math.max(0, Math.floor((now - active.startedAt) / 1000)) : 0;

  const finishWorkout = () => {
    if (stats.done === 0 && !window.confirm("No sets are completed yet. Finish anyway?")) return;
    setHistory((h) => [
      {
        id: `h${Date.now()}`,
        name: active.routineName,
        date: new Date().toISOString(),
        duration: elapsed,
        setsDone: stats.done,
        setsTotal: stats.total,
        volume: Math.round(stats.volume),
        exercises: active.exercises.length,
      },
      ...h,
    ]);
    setActive(null);
    setView("history");
  };

  const cancelWorkout = () => {
    if (window.confirm("Discard this workout? Your progress will be lost.")) {
      setActive(null);
      setView("routines");
    }
  };

  const clearHistory = () => {
    if (window.confirm("Clear all workout history?")) setHistory([]);
  };

  const totalVolume = history.reduce((a, h) => a + h.volume, 0);

  /* ================= render ================= */
  return (
    <div className="wt">
      <header className="wt-top">
        <div className="wt-brand">
          <span className="wt-mark">F</span>
          <span>FIT<span className="wt-light">BRO.</span></span>
        </div>
        <button className="wt-ghost" onClick={onBack}>← DASHBOARD</button>
      </header>

      <main className="wt-wrap">
        <div className="wt-hello">
          <div className="wt-kicker"><i /> WORKOUT TRACKER</div>
          <h1>Train. <span>Log it.</span> Repeat.</h1>
        </div>

        <div className="wt-tabs">
          <button className={view === "routines" ? "on" : ""} onClick={() => setView("routines")}>ROUTINES</button>
          <button className={view === "active" ? "on" : ""} onClick={() => active && setView("active")} disabled={!active}>
            {active ? <><i className="wt-live" /> IN PROGRESS</> : "ACTIVE"}
          </button>
          <button className={view === "history" ? "on" : ""} onClick={() => setView("history")}>HISTORY</button>
        </div>

        {/* ---------------- ROUTINES ---------------- */}
        {view === "routines" && (
          <>
            {active && (
              <div className="wt-banner">
                <span><i className="wt-live" /> Workout in progress: <b>{active.routineName}</b></span>
                <button onClick={() => setView("active")}>RESUME ↗</button>
              </div>
            )}

            <div className="wt-grid">
              {routines.map((r) => (
                <article className="wt-card wt-routine" key={r.id}>
                  <div className="wt-routine-top">
                    <div>
                      <h3>{r.name}</h3>
                      <small>{r.focus}</small>
                    </div>
                    <button className="wt-x" onClick={() => deleteRoutine(r.id)} aria-label="Delete routine">✕</button>
                  </div>

                  <ul>
                    {r.exercises.map((ex, i) => (
                      <li key={i}>
                        <span>{ex.name}</span>
                        <b>{ex.sets} × {ex.reps}</b>
                      </li>
                    ))}
                  </ul>

                  <button className="wt-primary" onClick={() => startWorkout(r)}>START WORKOUT ↗</button>
                </article>
              ))}

              {!creating && (
                <button className="wt-card wt-new" onClick={() => setCreating(true)}>
                  <span>＋</span>
                  CREATE ROUTINE
                </button>
              )}
            </div>

            {creating && (
              <form className="wt-card wt-form" onSubmit={saveRoutine}>
                <div className="wt-form-head">
                  <h3>New routine</h3>
                  <button type="button" className="wt-x" onClick={() => { setCreating(false); setFormError(""); }}>✕</button>
                </div>

                <div className="wt-form-row">
                  <label>ROUTINE NAME
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Arms & Abs" />
                  </label>
                  <label>FOCUS (OPTIONAL)
                    <input value={newFocus} onChange={(e) => setNewFocus(e.target.value)} placeholder="e.g. Biceps · Core" />
                  </label>
                </div>

                <div className="wt-ex-head"><span>EXERCISE</span><span>SETS</span><span>REPS</span><span /></div>
                {newEx.map((ex, i) => (
                  <div className="wt-ex-row" key={i}>
                    <input value={ex.name} onChange={(e) => updateNewEx(i, { name: e.target.value })} placeholder="Exercise name" />
                    <input type="number" min="1" value={ex.sets} onChange={(e) => updateNewEx(i, { sets: e.target.value })} />
                    <input type="number" min="1" value={ex.reps} onChange={(e) => updateNewEx(i, { reps: e.target.value })} />
                    <button
                      type="button" className="wt-x" aria-label="Remove exercise"
                      onClick={() => setNewEx((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l))}
                    >✕</button>
                  </div>
                ))}

                <button type="button" className="wt-link" onClick={() => setNewEx((l) => [...l, blankExercise()])}>
                  + ADD EXERCISE
                </button>

                {formError && <p className="wt-error">{formError}</p>}

                <div className="wt-actions">
                  <button type="button" className="wt-ghost" onClick={() => { setCreating(false); setFormError(""); }}>CANCEL</button>
                  <button type="submit" className="wt-primary">SAVE ROUTINE</button>
                </div>
              </form>
            )}
          </>
        )}

        {/* ---------------- ACTIVE WORKOUT ---------------- */}
        {view === "active" && active && (
          <div className="wt-active">
            <div className="wt-card wt-active-top">
              <div>
                <small>ACTIVE WORKOUT</small>
                <h2>{active.routineName}</h2>
              </div>
              <div className="wt-timer">{clock(elapsed)}</div>
            </div>

            <div className="wt-progress"><div style={{ width: `${stats.pct}%` }} /></div>
            <p className="wt-summary">
              <b>{stats.done}</b> / {stats.total} sets done · <b>{Math.round(stats.volume).toLocaleString()}</b> kg volume
            </p>

            {active.exercises.map((ex, ei) => (
              <div className="wt-card wt-ex" key={ei}>
                <h3>{ex.name}</h3>
                <div className="wt-set-head"><span>SET</span><span>KG</span><span>REPS</span><span /></div>
                {ex.sets.map((s, si) => (
                  <div className={`wt-set${s.done ? " done" : ""}`} key={si}>
                    <span className="wt-n">{si + 1}</span>
                    <input
                      type="number" inputMode="decimal" min="0" placeholder="0" value={s.weight}
                      onChange={(e) => updateSet(ei, si, { weight: e.target.value })}
                    />
                    <input
                      type="number" inputMode="numeric" min="0" placeholder="0" value={s.reps}
                      onChange={(e) => updateSet(ei, si, { reps: e.target.value })}
                    />
                    <button
                      className="wt-tick" aria-label={`Complete set ${si + 1}`}
                      onClick={() => updateSet(ei, si, { done: !s.done })}
                    >
                      {s.done ? "✓" : ""}
                    </button>
                  </div>
                ))}
                <button className="wt-link" onClick={() => addSet(ei)}>+ ADD SET</button>
              </div>
            ))}

            <div className="wt-actions">
              <button className="wt-ghost" onClick={cancelWorkout}>DISCARD</button>
              <button className="wt-primary" onClick={finishWorkout}>FINISH WORKOUT ✓</button>
            </div>
          </div>
        )}

        {/* ---------------- HISTORY ---------------- */}
        {view === "history" && (
          <div className="wt-history">
            <div className="wt-hstats">
              <div className="wt-card"><small>WORKOUTS</small><strong>{history.length}</strong></div>
              <div className="wt-card"><small>TOTAL VOLUME</small><strong>{totalVolume.toLocaleString()}<em> kg</em></strong></div>
              <div className="wt-card">
                <small>TOTAL TIME</small>
                <strong>{Math.round(history.reduce((a, h) => a + h.duration, 0) / 60)}<em> min</em></strong>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="wt-card wt-empty">
                <span>🏋️</span>
                <p>No workouts logged yet.</p>
                <button className="wt-primary" onClick={() => setView("routines")}>START YOUR FIRST WORKOUT ↗</button>
              </div>
            ) : (
              <>
                <ul className="wt-hlist">
                  {history.map((h) => (
                    <li className="wt-card" key={h.id}>
                      <div>
                        <h3>{h.name}</h3>
                        <small>{niceDate(h.date)}</small>
                      </div>
                      <div className="wt-hmeta">
                        <span><b>{clock(h.duration)}</b> time</span>
                        <span><b>{h.setsDone}/{h.setsTotal}</b> sets</span>
                        <span><b>{h.volume.toLocaleString()}</b> kg</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <button className="wt-link wt-clear" onClick={clearHistory}>CLEAR HISTORY</button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
