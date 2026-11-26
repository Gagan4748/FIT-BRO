import React, { useEffect, useRef, useState } from "react";
import Login from "./login.jsx";
import Dashboard from "./Dashboard.jsx";
import WorkoutTracker from "./workouttracker.jsx";
import ProgramModal from "./ProgramModal.jsx";
import ProgressTracker from "./ProgressTracker.jsx";
import NutritionTracker from "./Nutrition.jsx";
import UserProfile from "./UserProfile.jsx";
import AIChat from "./AIChat";
import ForgeDemo from "./components/ui/ForgeDemo";

const programs = [
  { number: "01", icon: "🏋️", title: "Build Strength", text: "Build a strong foundation with simple, progressive workouts.", tag: "STRENGTH" },
  { number: "02", icon: "⚡", title: "Everyday Fitness", text: "Improve your energy, mobility and everyday performance.", tag: "FITNESS" },
  { number: "03", icon: "🌿", title: "Mind & Recovery", text: "Recover well, stay consistent and return stronger.", tag: "RECOVERY" }
];

function App() {
  const [showForge, setShowForge] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null); // program card opened in the popup
  const [trackerProgram, setTrackerProgram] = useState(null);   // program to auto-start in the tracker
  const [pendingProgram, setPendingProgram] = useState(null);   // chosen before logging in
  const [userName, setUserName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState("");
  const [bmiMessage, setBmiMessage] = useState("");
  const [dietType, setDietType] = useState("veg");

  const heroRef = useRef(null);
  const canvasRef = useRef(null);

  // Reveal elements on scroll
  // (re-runs when returning from the login page or dashboard)
  useEffect(() => {
    if (showLogin || showDashboard || showTracker || showProgress || showNutrition || showProfile || showAIChat || showForge) return;

    const items = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [showLogin, showDashboard, showTracker, showProgress, showNutrition, showProfile, showAIChat, showForge]);

  // Mouse-following glowing particles
  // (re-runs when returning from the login page or dashboard)
  useEffect(() => {
    if (showLogin || showDashboard || showTracker || showProgress || showNutrition || showProfile || showAIChat || showForge) return;

    const canvas = canvasRef.current;
    const section = heroRef.current;

    if (!canvas || !section) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let raf = 0;
    let width = 0;
    let heightPx = 0;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      heightPx = rect.height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(heightPx * dpr);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${heightPx}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const addParticles = (x, y) => {
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8,
          radius: Math.random() * 2.3 + 1,
          life: 1
        });
      }

      if (particles.length > 180) {
        particles.splice(0, particles.length - 180);
      }
    };

    const onMove = (event) => {
      const rect = section.getBoundingClientRect();
      addParticles(event.clientX - rect.left, event.clientY - rect.top);
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, heightPx);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= 0.012;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(199,243,107,${Math.max(p.life, 0)})`;
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#c7f36b";
        ctx.fill();
      });

      particles = particles.filter((p) => p.life > 0);
      raf = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    section.addEventListener("pointermove", onMove);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      section.removeEventListener("pointermove", onMove);
    };
  }, [showLogin, showDashboard, showTracker, showProgress, showNutrition, showProfile, showAIChat, showForge]);

  // BMI calculator
  const calculateBMI = (event) => {
    event.preventDefault();

    const h = Number(height);
    const w = Number(weight);

    if (!h || !w || h < 80 || h > 250 || w < 20 || w > 350) {
      setBmi(null);
      setCategory("Check your details");
      setBmiMessage("Enter a height between 80–250 cm and weight between 20–350 kg.");
      return;
    }

    const value = w / ((h / 100) ** 2);
    setBmi(value.toFixed(1));

    if (value < 18.5) {
      setCategory("Underweight");
      setBmiMessage("Your BMI is below the standard adult range.");
    } else if (value < 25) {
      setCategory("Healthy range");
      setBmiMessage("Your BMI is within the standard healthy adult range.");
    } else if (value < 30) {
      setCategory("Overweight");
      setBmiMessage("Your BMI is above the standard healthy adult range.");
    } else {
      setCategory("Obesity range");
      setBmiMessage("Consider discussing your result with a qualified health professional.");
    }
  };

  const closeMenu = () => setMenuOpen(false);

  // "Start this program" from a program card
  const startProgram = (routine) => {
    setSelectedProgram(null);

    if (!userName) {
      // not logged in yet: log in first, then jump straight to the tracker
      setPendingProgram(routine);
      setShowLogin(true);
      return;
    }

    setTrackerProgram(routine);
    setShowTracker(true);
  };

  // Vegetarian meal plan
  const vegMeals = [
    ["🌅", "07:00 AM", "Breakfast", ["Oats or vegetable upma", "Milk or curd", "One seasonal fruit"], "ENERGY START"],
    ["☀️", "01:00 PM", "Lunch", ["Rice or chapati", "Dal or paneer", "Vegetable curry", "Curd and salad"], "BALANCED MEAL"],
    ["🍎", "05:00 PM", "Evening Snack", ["Roasted chana", "Peanuts", "Seasonal fruit"], "HEALTHY SNACK"],
    ["🌙", "08:00 PM", "Dinner", ["Chapati", "Paneer or dal", "Cooked vegetables", "Salad"], "RECOVERY MEAL"]
  ];

  // Non-vegetarian meal plan
  const nonVegMeals = [
    ["🌅", "07:00 AM", "Breakfast", ["Boiled eggs", "Whole wheat bread", "One seasonal fruit"], "ENERGY START"],
    ["☀️", "01:00 PM", "Lunch", ["Rice or chapati", "Grilled chicken or fish", "Vegetable curry", "Salad and curd"], "PROTEIN MEAL"],
    ["🍎", "05:00 PM", "Evening Snack", ["Boiled eggs", "Roasted chana", "One seasonal fruit"], "HEALTHY SNACK"],
    ["🌙", "08:00 PM", "Dinner", ["Chapati or rice", "Fish or chicken", "Cooked vegetables", "Salad"], "RECOVERY MEAL"]
  ];

  const meals = dietType === "veg" ? vegMeals : nonVegMeals;

  // Show Forge hero page
  if (showForge) {
    return (
      <>
        <ForgeDemo />
        <button
          onClick={() => setShowForge(false)}
          style={{ position: "fixed", bottom: 20, left: 20, zIndex: 200, padding: "12px 18px", borderRadius: 8, border: "1px solid #c7f36b", background: "#10130f", color: "#c7f36b", cursor: "pointer" }}
        >
          ← Back
        </button>
      </>
    );
  }

  // Show FIT BRO AI Chat
  if (showAIChat) {
    return (
      <AIChat
        onBack={() => {
          setShowAIChat(false);
          setShowDashboard(true);
        }}
      />
    );
  }

  // Show user profile (must stay AFTER all hooks)
  if (showProfile) {
    return (
      <UserProfile
        user={userName}
        email={userEmail}
        onNameChange={setUserName}
        onBack={() => {
          setShowProfile(false);
          setShowDashboard(true);
        }}
        onLogout={() => {
          setShowProfile(false);
          setUserName("");
          setUserEmail("");
          setShowLogin(true);
        }}
      />
    );
  }

  // Show nutrition tracker (must stay AFTER all hooks)
  if (showNutrition) {
    return (
      <NutritionTracker
        onBack={() => {
          setShowNutrition(false);
          setShowDashboard(true);
        }}
      />
    );
  }

  // Show progress tracker (must stay AFTER all hooks)
  if (showProgress) {
    return (
      <ProgressTracker
        onBack={() => {
          setShowProgress(false);
          setShowDashboard(true);
        }}
      />
    );
  }

  // Show workout tracker (must stay AFTER all hooks)
  if (showTracker) {
    return (
      <WorkoutTracker
        startProgram={trackerProgram}
        onBack={() => {
          setTrackerProgram(null);
          setShowTracker(false);
          setShowDashboard(true);
        }}
      />
    );
  }

  // Show dashboard (must stay AFTER all hooks)
  if (showDashboard) {
    return (
      <Dashboard
        user={userName}
        onOpenAI={() => {
          setShowDashboard(false);
          setShowAIChat(true);
        }}
        onOpenTracker={() => {
          setTrackerProgram(null);
          setShowDashboard(false);
          setShowTracker(true);
        }}
        onOpenProfile={() => {
          setShowDashboard(false);
          setShowProfile(true);
        }}
        onOpenNutrition={() => {
          setShowDashboard(false);
          setShowNutrition(true);
        }}
        onOpenProgress={() => {
          setShowDashboard(false);
          setShowProgress(true);
        }}
        onHome={() => setShowDashboard(false)}
        onLogout={() => {
          setShowDashboard(false);
          setUserName("");
          setUserEmail("");
          setShowLogin(true);
        }}
      />
    );
  }

  // Show login page (must stay AFTER all hooks)
  if (showLogin) {
    return (
      <Login
        onBack={() => {
          setShowLogin(false);
          setShowAIChat(false);
          setShowDashboard(true);
        }}
        onLogin={(name, email) => {
          setUserName(name);
          setUserEmail(email || "");
          setShowLogin(false);

          if (pendingProgram) {
            // they picked a program before logging in: open it in the tracker
            setTrackerProgram(pendingProgram);
            setPendingProgram(null);
            setShowTracker(true);
          } else {
            setShowDashboard(true);
          }
        }}
      />
    );
  }

  return (
    <div className="site-shell">
      <div className="nav-wrap">
        <nav className="nav container">

          <a className="brand" href="#home" onClick={closeMenu}>
            <span className="brand-mark">F</span>
            <span>FIT<span className="brand-light">BRO.</span></span>
          </a>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#programs" onClick={closeMenu}>Programs</a>
            <a href="#approach" onClick={closeMenu}>Our Approach</a>
            <a href="#bmi" onClick={closeMenu}>BMI Calculator</a>
            <a href="#diet" onClick={closeMenu}>Diet Plan</a>
            <a href="#!" onClick={(e) => { e.preventDefault(); setShowForge(true); closeMenu(); }}>Forge</a>
          </div>

          <button
            className="nav-cta"
            onClick={() => {
              setShowLogin(true);
              setMenuOpen(false);
            }}
          >
            LOGIN / SIGN UP ↗
          </button>

        </nav>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className="hero" id="home" ref={heroRef}>
          <canvas className="hero-particles" ref={canvasRef} />
          <div className="hero-glow glow-a" />
          <div className="hero-glow glow-b" />

          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="live-dot" /> YOUR ROUTINE. YOUR RULES.
              </div>

              <h1>
                BUILD<br />
                <span className="outline">YOUR</span><br />
                <span className="lime">BEYOND.</span>
              </h1>

              <p className="hero-text">
                Fitness is not a finish line. It is the little promise you keep
                to yourself every day. Find your rhythm, get stronger, and make
                progress that lasts.
              </p>

              <div className="hero-actions">
                <a className="btn-primary" href="#programs">
                  EXPLORE PROGRAMS <span>↗</span>
                </a>
                <a className="btn-ghost" href="#approach">
                  ▶ THE FIT BRO WAY
                </a>
              </div>

              <div className="hero-note">
                <div><strong>01</strong><span>Start where you are</span></div>
                <div><strong>02</strong><span>Move at your pace</span></div>
                <div><strong>∞</strong><span>Keep showing up</span></div>
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-ring ring-one" />
              <div className="hero-ring ring-two" />

              <div className="athlete-card">
                <div className="athlete-topline">
                  <span>FIT BRO / TRAINING</span>
                  <span>001 — 026</span>
                </div>

                <div className="athlete-emoji" aria-label="Athlete lifting weights">🏋️‍♂️</div>

                <div className="athlete-caption">
                  <span>BUILT BY HABIT</span>
                  <strong>STRONGER<br />EVERY DAY.</strong>
                </div>
              </div>

              <div className="float-chip chip-one">
                <span className="chip-dot" /> CONSISTENCY IS KEY
              </div>

              <div className="float-chip chip-two">
                ✦ <b>PROGRESS MODE</b><br />
                <small>ALWAYS ON</small>
              </div>

              <div className="art-orbit-dot" />
            </div>
          </div>

          <a className="scroll-cue" href="#programs">
            <span /> SCROLL TO EXPLORE
          </a>
        </section>

        {/* MOVING TICKER */}
        <div className="ticker">
          <div className="ticker-track">
            {[0, 1, 2, 3].map((item) => (
              <span key={item}>
                MOVE WITH PURPOSE ✳ BUILD YOUR HABITS ✳ GET 1% BETTER ✳ STRONGER EVERY DAY ✳
              </span>
            ))}
          </div>
        </div>

        {/* PROGRAMS */}
        <section className="programs section-pad" id="programs">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <div className="eyebrow">THE STARTING POINT / 01</div>
                <h2>Find your <em>kind</em><br />of strong.</h2>
              </div>
              <p className="section-copy">
                No one-size-fits-all fitness. Choose a starting point that
                matches your goal, then make it your own.
              </p>
            </div>

            <div className="program-grid">
              {programs.map((program, index) => (
                <article
                  className={`program-card reveal delay-${index}`}
                  key={program.number}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedProgram(program)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedProgram(program);
                    }
                  }}
                >
                  <div className="card-top">
                    <span>PROGRAM / {program.number}</span>
                    <span className="card-arrow">↗</span>
                  </div>
                  <div className="program-visual">{program.icon}</div>
                  <div className="program-tag">{program.tag}</div>
                  <h3>{program.title}</h3>
                  <p>{program.text}</p>
                  <div className="card-bottom">
                    <span>{program.number} — 03</span>
                    <span>FIT BRO ®</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* APPROACH */}
        <section className="manifesto section-pad" id="approach">
          <div className="container manifesto-grid">
            <div className="reveal">
              <div className="eyebrow">A BETTER WAY TO BEGIN / 02</div>
              <h2>Small steps.<br /><span>Big energy.</span></h2>
            </div>

            <div className="manifesto-right reveal delay-1">
              <p>
                FIT BRO is built around a simple idea: a fitness journey should
                feel achievable. Start with what you have, build a routine that
                fits your life, and celebrate the progress that does not always
                show on a weighing scale.
              </p>

              <div className="manifesto-points">
                <div><b>01</b><span>Start simple</span></div>
                <div><b>02</b><span>Stay regular</span></div>
                <div><b>03</b><span>Track progress</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* BMI CALCULATOR */}
        <section className="bmi-section section-pad" id="bmi">
          <div className="container bmi-shell">
            <div className="bmi-intro reveal">
              <div className="eyebrow">A QUICK CHECK-IN / 03</div>
              <h2>Know your<br /><em>starting point.</em></h2>
              <p className="section-copy">
                Enter your height and weight to calculate your Body Mass Index
                (BMI). Use it as one small piece of information, not a complete
                measure of your health.
              </p>

              <div className="bmi-facts">
                <span>01 / SIMPLE</span>
                <span>02 / QUICK</span>
                <span>03 / INFORMATIVE</span>
              </div>
            </div>

            <div className="bmi-card reveal delay-1">
              <div className="bmi-card-head">
                <h3>BMI Calculator</h3>
                <span>TOOL / 001</span>
              </div>

              <form onSubmit={calculateBMI}>
                <div className="field-row">
                  <label className="field">
                    Height <span>CM</span>
                    <input
                      type="number"
                      min="80"
                      max="250"
                      step="0.1"
                      placeholder="e.g. 170"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      required
                    />
                  </label>

                  <label className="field">
                    Weight <span>KG</span>
                    <input
                      type="number"
                      min="20"
                      max="350"
                      step="0.1"
                      placeholder="e.g. 65"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <button className="btn-primary bmi-submit" type="submit">
                  CALCULATE MY BMI <span>↗</span>
                </button>
              </form>

              <div className={`bmi-result ${
                category === "Healthy range" ? "normal" :
                category === "Underweight" ? "underweight" :
                category === "Overweight" ? "overweight" :
                category === "Obesity range" ? "obese" : ""
              }`}>
                <div>
                  <small>YOUR BMI RESULT</small>
                  <strong key={bmi || "empty"}>{bmi || "--.-"}</strong>
                </div>
                <div className="bmi-status">
                  {category || "Waiting for input"}
                </div>
              </div>

              <div className="bmi-scale">
                <i /><i /><i /><i />
              </div>

              <div className="scale-labels">
                <span>LOW</span>
                <span>HEALTHY</span>
                <span>HIGH</span>
                <span>VERY HIGH</span>
              </div>

              <p className="bmi-disclaimer">
                {bmiMessage || "BMI is a screening estimate, not a diagnosis. It does not account for muscle mass, age or individual health factors."}
              </p>
            </div>
          </div>
        </section>

        {/* DIET PLAN */}
        <section className="diet-section section-pad" id="diet">
          <div className="container">
            <div className="eyebrow">FUEL YOUR BODY / 04</div>

            <div className="diet-heading">
              <h2>Eat well.<br /><em>Feel stronger.</em></h2>
              <p className="section-copy">
                Choose a meal plan that matches your food preference. Build
                balanced meals with protein, vegetables, fruits and whole grains.
              </p>
            </div>

            <div className="diet-toggle">
              <button
                className={dietType === "veg" ? "active" : ""}
                onClick={() => setDietType("veg")}
              >
                🥗 Vegetarian
              </button>

              <button
                className={dietType === "nonveg" ? "active" : ""}
                onClick={() => setDietType("nonveg")}
              >
                🍗 Non-Vegetarian
              </button>
            </div>

            <div className="diet-grid">
              {meals.map((meal) => (
                <article className="diet-card" key={meal[2]}>
                  <div className="meal-card-top">
                    <span>{meal[0]}</span>
                    <small>{meal[1]}</small>
                  </div>

                  <h3>{meal[2]}</h3>

                  <ul>
                    {meal[3].map((food) => (
                      <li key={food}>{food}</li>
                    ))}
                  </ul>

                  <span className="meal-tag">{meal[4]}</span>
                </article>
              ))}
            </div>

            <p className="diet-note">
              NOTE: These are sample meal ideas. Adjust portions and food
              choices to your individual needs, preferences and health requirements.
            </p>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta section-pad" id="start">
          <div className="container">
            <div className="cta-box reveal">
              <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
              <h2>Show up today.<br /><em>Thank yourself later.</em></h2>
              <p>
                Choose one healthy action today. A walk, a workout, a good meal,
                or a little more rest. The first step counts.
              </p>

              <a className="btn-primary" href="#programs">
                FIND YOUR START ↗
              </a>

              <div className="cta-stamp">FIT<br />BRO.</div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <a className="brand" href="#home">
            <span className="brand-mark">F</span>
            <span>FIT<span className="brand-light">BRO.</span></span>
          </a>

          <span>© {new Date().getFullYear()} FIT BRO — COLLEGE MINI PROJECT</span>
          <a href="#home">BACK TO TOP ↑</a>
        </div>
      </footer>

      {/* PROGRAM DETAILS POPUP */}
      {selectedProgram && (
        <ProgramModal
          program={selectedProgram}
          loggedIn={!!userName}
          onClose={() => setSelectedProgram(null)}
          onStart={startProgram}
        />
      )}
    </div>
  );
}

export default App;