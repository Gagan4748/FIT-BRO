import { useEffect, useMemo, useRef, useState } from "react";
import "./UserProfile.css";

/* ------------------------------------------------------------------ */
/*  options                                                            */
/* ------------------------------------------------------------------ */
const GOALS = [
  { key: "lose", label: "Lose fat", icon: "🔥" },
  { key: "build", label: "Build muscle", icon: "💪" },
  { key: "gain", label: "Gain weight", icon: "⚖️" },
  { key: "maintain", label: "Maintain fitness", icon: "🎯" },
  { key: "stamina", label: "Improve stamina", icon: "⚡" },
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const PREFERENCES = ["Gym", "Home workouts", "Outdoor & running", "Yoga & stretching", "Mixed"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const EMOJIS = ["🏋️", "💪", "🔥", "⚡", "🌿", "🥇", "🏃", "🧘"];

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */
const todayStr = () => new Date().toLocaleDateString("en-CA");
const bmiOf = (kg, cm) => kg / (cm / 100) ** 2;

function bmiInfo(v) {
  if (v < 18.5) return { label: "Underweight", cls: "under" };
  if (v < 25) return { label: "Healthy range", cls: "ok" };
  if (v < 30) return { label: "Overweight", cls: "over" };
  return { label: "Obesity range", cls: "obese" };
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
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

/* data saved by the Progress Tracker page: keeps both pages in sync */
function readProgress() {
  try {
    const d = JSON.parse(localStorage.getItem("fb-progress"));
    if (!d || !d.profile) return null;
    const sorted = Array.isArray(d.entries) ? [...d.entries].sort((a, b) => a.date.localeCompare(b.date)) : [];
    return {
      height: d.profile.height,
      goal: d.profile.goal,
      weight: sorted.length ? sorted[sorted.length - 1].weight : d.profile.start,
    };
  } catch {
    return null;
  }
}

function syncProgress(p) {
  try {
    let d = null;
    try { d = JSON.parse(localStorage.getItem("fb-progress")); } catch { d = null; }
    if (!d || typeof d !== "object") d = { profile: null, entries: [] };
    if (!Array.isArray(d.entries)) d.entries = [];
    const start = d.profile ? d.profile.start : p.weight;
    d.profile = { height: p.height, start, goal: p.target };
    const today = todayStr();
    d.entries = [...d.entries.filter((e) => e.date !== today), { id: `e${Date.now()}`, date: today, weight: p.weight }];
    localStorage.setItem("fb-progress", JSON.stringify(d));
  } catch { /* ignore */ }
}

/* crop to a square and shrink, so the photo stays small in storage */
function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

const blankProfile = (name, email) => ({
  name: name || "", email: email || "", age: "", gender: "", height: "", weight: "", target: "",
  goals: [], level: "Beginner", pref: "Gym", avatar: { type: "none", value: "" },
});

const toDraft = (v) => ({
  ...v,
  age: v.age === "" ? "" : String(v.age),
  height: v.height === "" ? "" : String(v.height),
  weight: v.weight === "" ? "" : String(v.weight),
  target: v.target === "" ? "" : String(v.target),
  goals: [...v.goals],
  avatar: { ...v.avatar },
});

function validate(d) {
  if (!d.name.trim()) return "Please enter your name.";
  if (d.name.trim().length > 40) return "Name should be 40 characters or less.";
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return "Enter a valid email address.";
  const age = Number(d.age), h = Number(d.height), w = Number(d.weight), t = Number(d.target);
  if (!age || age < 10 || age > 100) return "Enter an age between 10 and 100.";
  if (!h || h < 80 || h > 250) return "Enter a height between 80 and 250 cm.";
  if (!w || w < 20 || w > 350) return "Enter a current weight between 20 and 350 kg.";
  if (!t || t < 20 || t > 350) return "Enter a target weight between 20 and 350 kg.";
  if (d.goals.length === 0) return "Choose at least one fitness goal.";
  return "";
}

/* ------------------------------------------------------------------ */
/*  small components                                                   */
/* ------------------------------------------------------------------ */
function Avatar({ avatar, name, size }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="up-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {avatar.type === "photo" ? <img src={avatar.value} alt="Profile" />
        : avatar.type === "emoji" ? <span>{avatar.value}</span>
        : <span>{initial}</span>}
    </div>
  );
}

function PasswordForm({ onDone }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!cur) return setError("Enter your current password.");
    if (next.length < 6) return setError("New password must be at least 6 characters.");
    if (next === cur) return setError("New password must be different from the current one.");
    if (next !== again) return setError("New passwords do not match.");
    setError("");
    // TODO: call your backend here, e.g. await api.changePassword({ current: cur, next })
    // Passwords are never stored in the browser.
    onDone();
  };

  return (
    <form className="up-pass" onSubmit={submit}>
      <label>CURRENT PASSWORD
        <input type={show ? "text" : "password"} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
      </label>
      <label>NEW PASSWORD
        <input type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </label>
      <label>CONFIRM NEW PASSWORD
        <input type={show ? "text" : "password"} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" />
      </label>
      <label className="up-check">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
      </label>
      {error && <p className="up-error">{error}</p>}
      <button type="submit" className="up-primary">UPDATE PASSWORD</button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  main component                                                     */
/* ------------------------------------------------------------------ */
export default function UserProfile({ user, email, onBack, onLogout, onNameChange }) {
  const [stored, setStored] = useStored("fb-profile", null);
  const prog = useMemo(readProgress, [stored]);

  // saved profile, with height / weight / target kept in sync with the Progress Tracker
  const base = stored || blankProfile(user, email);
  const view = {
    ...base,
    height: prog ? prog.height : base.height,
    weight: prog ? prog.weight : base.weight,
    target: prog ? prog.goal : base.target,
  };

  const [editing, setEditing] = useState(!stored);
  const [draft, setDraft] = useState(() => toDraft(view));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPass, setShowPass] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(t);
  }, [notice]);

  const d = editing ? draft : view;
  const set = (k, v) => setDraft((x) => ({ ...x, [k]: v }));
  const toggleGoal = (key) =>
    setDraft((x) => ({ ...x, goals: x.goals.includes(key) ? x.goals.filter((g) => g !== key) : [...x.goals, key] }));

  /* ----- derived ----- */
  const h = Number(d.height), w = Number(d.weight), t = Number(d.target);
  const bmi = h >= 80 && w >= 20 ? bmiOf(w, h) : null;
  const bmiMeta = bmi ? bmiInfo(bmi) : null;
  const toTarget = w && t ? t - w : null;

  const filled = [
    d.name.trim(), d.email.trim(), d.age, d.height, d.weight, d.target,
    d.goals.length > 0, d.level, d.pref, d.avatar.type !== "none",
  ].filter(Boolean).length;
  const completeness = Math.round((filled / 10) * 100);

  /* ----- actions ----- */
  const startEdit = () => {
    setDraft(toDraft(view));
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    if (!stored) return; // first-time setup cannot be cancelled
    setEditing(false);
    setError("");
  };

  const save = (e) => {
    e.preventDefault();
    const err = validate(draft);
    if (err) return setError(err);
    const clean = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      age: Number(draft.age),
      gender: draft.gender,
      height: Number(draft.height),
      weight: Number(draft.weight),
      target: Number(draft.target),
      goals: draft.goals,
      level: draft.level,
      pref: draft.pref,
      avatar: draft.avatar,
    };
    setStored(clean);
    syncProgress(clean);
    if (onNameChange) onNameChange(clean.name);
    setEditing(false);
    setError("");
    setNotice("Profile saved ✓");
  };

  const onPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 8 * 1024 * 1024) return setError("Image is too large. Choose one under 8 MB.");
    try {
      const url = await resizeImage(file);
      set("avatar", { type: "photo", value: url });
      setError("");
    } catch {
      setError("Could not read that image. Try another one.");
    }
  };

  const confirmLogout = () => {
    if (window.confirm("Log out of FIT BRO?")) onLogout();
  };

  /* ================= render ================= */
  const goalLabels = GOALS.filter((g) => view.goals.includes(g.key));

  return (
    <div className="up">
      <header className="up-top">
        <div className="up-brand">
          <span className="up-mark">F</span>
          <span>FIT<span className="up-light">BRO.</span></span>
        </div>
        <button className="up-ghost" onClick={onBack}>← DASHBOARD</button>
      </header>

      <form className="up-wrap" onSubmit={save}>
        {notice && <div className="up-notice">{notice}</div>}

        {/* ---------------- hero ---------------- */}
        <section className="up-card up-hero">
          <Avatar avatar={d.avatar} name={d.name} size={104} />
          <div className="up-hero-main">
            <div className="up-kicker"><i /> MY PROFILE</div>
            <h1>{view.name || "Your name"}</h1>
            <p className="up-muted">{view.email || "Add your email"}</p>
            <div className="up-chips">
              <span className="up-chip lvl">{view.level}</span>
              {goalLabels.map((g) => <span className="up-chip" key={g.key}>{g.icon} {g.label}</span>)}
            </div>
          </div>
          <div className="up-hero-side">
            <div className="up-complete">
              <div><small>PROFILE COMPLETE</small><b>{completeness}%</b></div>
              <div className="up-bar"><div style={{ width: `${completeness}%` }} /></div>
            </div>
            {!editing && (
              <button type="button" className="up-primary" onClick={startEdit}>✎ EDIT PROFILE</button>
            )}
          </div>
        </section>

        {!stored && (
          <div className="up-banner">👋 Welcome! Fill in your details to personalise FIT BRO, then press <b>Save profile</b>.</div>
        )}

        <div className="up-grid">
          {/* ---------------- 1. personal information ---------------- */}
          <section className="up-card">
            <div className="up-head"><h3>1. Personal information</h3></div>

            <div className="up-photo">
              <Avatar avatar={d.avatar} name={d.name} size={72} />
              {editing ? (
                <div className="up-photo-tools">
                  <div className="up-photo-btns">
                    <button type="button" className="up-small" onClick={() => fileRef.current && fileRef.current.click()}>📷 UPLOAD PHOTO</button>
                    {d.avatar.type !== "none" && (
                      <button type="button" className="up-small danger" onClick={() => set("avatar", { type: "none", value: "" })}>REMOVE</button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
                  </div>
                  <div className="up-emojis">
                    {EMOJIS.map((em) => (
                      <button
                        type="button" key={em}
                        className={d.avatar.type === "emoji" && d.avatar.value === em ? "on" : ""}
                        onClick={() => set("avatar", { type: "emoji", value: em })}
                      >{em}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="up-muted up-small-text">Profile photo or avatar</p>
              )}
            </div>

            <div className="up-fields">
              <label>NAME
                <input value={d.name} disabled={!editing} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
              </label>
              <label>AGE
                <input type="number" min="10" max="100" value={d.age} disabled={!editing} onChange={(e) => set("age", e.target.value)} placeholder="Years" />
              </label>
              <label>GENDER <em>(optional)</em>
                <select value={d.gender} disabled={!editing} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Not specified</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label>HEIGHT (CM)
                <input type="number" step="0.1" min="80" max="250" value={d.height} disabled={!editing} onChange={(e) => set("height", e.target.value)} placeholder="e.g. 172" />
              </label>
              <label>CURRENT WEIGHT (KG)
                <input type="number" step="0.1" min="20" max="350" value={d.weight} disabled={!editing} onChange={(e) => set("weight", e.target.value)} placeholder="e.g. 70" />
              </label>
            </div>
          </section>

          {/* ---------------- 2. fitness goals ---------------- */}
          <section className="up-card">
            <div className="up-head"><h3>2. Fitness goals</h3><span>{editing ? "PICK ONE OR MORE" : ""}</span></div>
            <div className="up-goals">
              {GOALS.map((g) => {
                const on = d.goals.includes(g.key);
                return (
                  <button
                    type="button" key={g.key} disabled={!editing}
                    className={`up-goal${on ? " on" : ""}`} onClick={() => toggleGoal(g.key)}
                  >
                    <span>{g.icon}</span>
                    <b>{g.label}</b>
                    <i>{on ? "✓" : ""}</i>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ---------------- 4. fitness information (shown beside goals) ---------------- */}
          <section className="up-card">
            <div className="up-head"><h3>3. Fitness information</h3></div>

            <div className="up-bmi">
              <div>
                <small>CURRENT BMI</small>
                <strong>{bmi ? bmi.toFixed(1) : "--.-"}</strong>
              </div>
              {bmiMeta ? <span className={`up-bchip ${bmiMeta.cls}`}>{bmiMeta.label}</span> : <span className="up-muted up-small-text">Add height and weight</span>}
            </div>

            <div className="up-fields">
              <label>TARGET WEIGHT (KG)
                <input type="number" step="0.1" min="20" max="350" value={d.target} disabled={!editing} onChange={(e) => set("target", e.target.value)} placeholder="e.g. 65" />
              </label>
              <div className="up-togo">
                <small>TO TARGET</small>
                <b>
                  {toTarget === null ? "--" : toTarget === 0 ? "On target 🎯" : `${toTarget > 0 ? "+" : "−"}${Math.abs(toTarget).toFixed(1)} kg`}
                </b>
              </div>
            </div>

            <div className="up-block">
              <small>FITNESS LEVEL</small>
              <div className="up-seg">
                {LEVELS.map((l) => (
                  <button type="button" key={l} disabled={!editing} className={d.level === l ? "on" : ""} onClick={() => set("level", l)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="up-block">
              <small>WORKOUT PREFERENCE</small>
              <div className="up-pills">
                {PREFERENCES.map((p) => (
                  <button type="button" key={p} disabled={!editing} className={d.pref === p ? "on" : ""} onClick={() => set("pref", p)}>{p}</button>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------- 3. account information ---------------- */}
          <section className="up-card">
            <div className="up-head"><h3>4. Account information</h3></div>

            <div className="up-fields one">
              <label>EMAIL ADDRESS
                <input type="email" value={d.email} disabled={!editing} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
              </label>
            </div>

            <div className="up-acc-actions">
              <button type="button" className="up-row" onClick={() => setShowPass((s) => !s)}>
                <span>🔒 Change password</span><i>{showPass ? "−" : "+"}</i>
              </button>
              {showPass && (
                <PasswordForm onDone={() => { setShowPass(false); setNotice("Password updated ✓"); }} />
              )}

              {!editing && (
                <button type="button" className="up-row" onClick={startEdit}>
                  <span>✎ Edit profile</span><i>›</i>
                </button>
              )}

              <button type="button" className="up-row logout" onClick={confirmLogout}>
                <span>⏻ Logout</span><i>›</i>
              </button>
            </div>
          </section>
        </div>

        {/* ---------------- save bar ---------------- */}
        {editing && (
          <div className="up-savebar">
            {error && <p className="up-error">{error}</p>}
            <div className="up-save-actions">
              {stored && <button type="button" className="up-ghost" onClick={cancelEdit}>CANCEL</button>}
              <button type="submit" className="up-primary">SAVE PROFILE ↗</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}