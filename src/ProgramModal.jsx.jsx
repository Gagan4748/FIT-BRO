import { useEffect } from "react";
import "./ProgramModal.css";

/* Details for each program card. Keys match the card numbers in App.jsx. */
export const PROGRAM_DETAILS = {
  "01": {
    level: "Beginner friendly",
    days: "4 days / week",
    minutes: "45 min / session",
    intro:
      "Build a strong base with simple, progressive lifts. Start light, learn good form, then add a little weight or a few reps each week.",
    schedule: [
      ["Mon", "Push: chest, shoulders, triceps"],
      ["Tue", "Lower body: squats and lunges"],
      ["Wed", "Rest or light walk"],
      ["Thu", "Pull: back and biceps"],
      ["Fri", "Full body strength"],
      ["Sat", "Easy walk or stretching"],
      ["Sun", "Rest"],
    ],
    tips: [
      "Add a little weight or one extra rep each week (progressive overload).",
      "Rest 60–90 seconds between sets.",
      "Good form first, heavier weights later.",
      "Eat enough protein and sleep 7–8 hours.",
    ],
    routine: {
      name: "Build Strength",
      focus: "Full body · Strength",
      exercises: [
        { name: "Squat", sets: 3, reps: 8 },
        { name: "Bench Press / Push-ups", sets: 3, reps: 8 },
        { name: "Dumbbell Row", sets: 3, reps: 10 },
        { name: "Overhead Press", sets: 3, reps: 10 },
        { name: "Plank (seconds)", sets: 3, reps: 40 },
      ],
    },
  },

  "02": {
    level: "All levels",
    days: "5 days / week",
    minutes: "30 min / session",
    intro:
      "Boost your daily energy, mobility and stamina with short, simple sessions that fit around a busy day.",
    schedule: [
      ["Mon", "Cardio: brisk walk or jog"],
      ["Tue", "Mobility and core"],
      ["Wed", "Bodyweight circuit"],
      ["Thu", "Active rest: easy walk"],
      ["Fri", "Cardio and legs"],
      ["Sat", "Sport or fun activity"],
      ["Sun", "Rest"],
    ],
    tips: [
      "Aim for a pace where you can still talk during cardio.",
      "Take the stairs, walk after meals, move a little every hour.",
      "Drink water before, during and after training.",
      "Consistency beats intensity. Keep showing up.",
    ],
    routine: {
      name: "Everyday Fitness",
      focus: "Energy · Mobility · Stamina",
      exercises: [
        { name: "Jumping Jacks", sets: 3, reps: 30 },
        { name: "Bodyweight Squats", sets: 3, reps: 15 },
        { name: "Push-ups", sets: 3, reps: 10 },
        { name: "Lunges", sets: 3, reps: 12 },
        { name: "Plank (seconds)", sets: 3, reps: 30 },
      ],
    },
  },

  "03": {
    level: "All levels",
    days: "Daily",
    minutes: "20 min / session",
    intro:
      "Recover well so you can train again. Gentle stretching, easy breathing and good habits help your body and mind reset.",
    schedule: [
      ["Mon", "Full body stretch"],
      ["Tue", "Breathing and relaxation"],
      ["Wed", "Hips and lower back"],
      ["Thu", "Easy walk outside"],
      ["Fri", "Shoulders and neck"],
      ["Sat", "Longer stretch session"],
      ["Sun", "Full rest and early sleep"],
    ],
    tips: [
      "Sleep 7–8 hours. Recovery happens while you rest.",
      "Stretch gently. It should feel good, never painful.",
      "Take slow, deep breaths to calm your mind.",
      "Rest days are part of the plan, not a break from it.",
    ],
    routine: {
      name: "Mind & Recovery",
      focus: "Stretching · Breathing · Reset",
      exercises: [
        { name: "Cat-Cow (reps)", sets: 2, reps: 10 },
        { name: "Child's Pose (seconds)", sets: 2, reps: 30 },
        { name: "Hamstring Stretch (seconds)", sets: 2, reps: 30 },
        { name: "Hip Flexor Stretch (seconds)", sets: 2, reps: 30 },
        { name: "Deep Breaths", sets: 1, reps: 10 },
      ],
    },
  },
};

export default function ProgramModal({ program, loggedIn, onClose, onStart }) {
  // close on Escape + lock page scroll while open
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const d = PROGRAM_DETAILS[program.number];
  if (!d) return null;

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div
        className="pm-panel"
        role="dialog"
        aria-modal="true"
        aria-label={program.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="pm-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="pm-head">
          <span className="pm-icon">{program.icon}</span>
          <div>
            <small>PROGRAM / {program.number} · {program.tag}</small>
            <h2>{program.title}</h2>
          </div>
        </div>

        <p className="pm-intro">{d.intro}</p>

        <div className="pm-meta">
          <span>🎯 {d.level}</span>
          <span>📅 {d.days}</span>
          <span>⏱️ {d.minutes}</span>
        </div>

        <div className="pm-cols">
          <section>
            <h3>WEEKLY SCHEDULE</h3>
            <ul>
              {d.schedule.map(([day, what]) => (
                <li key={day}><b>{day}</b><span>{what}</span></li>
              ))}
            </ul>
          </section>

          <section>
            <h3>CORE WORKOUT</h3>
            <ul>
              {d.routine.exercises.map((ex) => (
                <li key={ex.name}><span>{ex.name}</span><b>{ex.sets} × {ex.reps}</b></li>
              ))}
            </ul>
          </section>
        </div>

        <section className="pm-tips">
          <h3>TIPS</h3>
          <ul>
            {d.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <div className="pm-actions">
          <button className="pm-ghost" onClick={onClose}>CLOSE</button>
          <button className="pm-primary" onClick={() => onStart(d.routine)}>
            {loggedIn ? "START THIS PROGRAM ↗" : "LOGIN TO START ↗"}
          </button>
        </div>
      </div>
    </div>
  );
}
