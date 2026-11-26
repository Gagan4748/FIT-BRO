import React, { useEffect, useRef, useState } from "react";
import "./login.css";
import { initLoginBg3D } from "./login1.js";
import "./login-bg3d-additions.css";


function Login({ onBack, onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [slashKey, setSlashKey] = useState(0);
  const canvasRef = useRef(null);
  const pageRef = useRef(null);

// 3D Toji background effect
useEffect(() => {
  return initLoginBg3D({
    root: pageRef.current,
    image: "/login-bg.jpg"
  });
}, []);

  // Live canvas: rising embers + slash trail that follows the pointer
  useEffect(() => {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    if (!canvas || !page) return;

    const ctx = canvas.getContext("2d");
    let embers = [];
    let trail = [];
    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = page.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnEmber = (x, y, burst = false) => {
      embers.push({
        x: x ?? Math.random() * width,
        y: y ?? height + 10,
        vx: (Math.random() - 0.5) * (burst ? 3 : 0.6),
        vy: burst ? (Math.random() - 0.5) * 3 : -(Math.random() * 1.2 + 0.4),
        r: Math.random() * 2 + 0.8,
        life: 1
      });
      if (embers.length > 260) embers.splice(0, embers.length - 260);
    };

    const onMove = (e) => {
      const rect = page.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      trail.push({ x, y, life: 1 });
      if (trail.length > 28) trail.shift();
      spawnEmber(x, y, true);
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      if (Math.random() < 0.35) spawnEmber();

      // embers
      embers.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.008;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,70,70,${Math.max(p.life, 0)})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#ff2e3a";
        ctx.fill();
      });
      embers = embers.filter((p) => p.life > 0 && p.y > -20);

      // slash trail
      ctx.shadowBlur = 0;
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(b.life, 0) * 0.8})`;
        ctx.lineWidth = 1 + b.life * 2.5;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      trail.forEach((t) => (t.life -= 0.045));
      trail = trail.filter((t) => t.life > 0);

      raf = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    page.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      page.removeEventListener("pointermove", onMove);
    };
  }, []);

  // ===== ADDED: 3D mouse tilt for the heading text and the login box =====
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = page.querySelector(".login-card");
    const left = page.querySelector(".login-left");

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;

    const onMove = (e) => {
      const rect = page.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ty = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
    };

    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;

      // no tilt on small screens
      const k = window.innerWidth > 900 ? 1 : 0;
      const mx = (x * k).toFixed(3);
      const my = (y * k).toFixed(3);

      if (card) {
        card.style.setProperty("--mx", mx);
        card.style.setProperty("--my", my);
        card.style.setProperty("--gx", `${(50 + x * 45).toFixed(1)}%`);
        card.style.setProperty("--gy", `${(50 + y * 45).toFixed(1)}%`);
      }
      if (left) {
        left.style.setProperty("--mx", mx);
        left.style.setProperty("--my", my);
      }
      raf = requestAnimationFrame(tick);
    };

    tick();
    page.addEventListener("pointermove", onMove);
    page.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      page.removeEventListener("pointermove", onMove);
      page.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  // ===== END ADDED =====

 const handleSubmit = async (e) => {
  e.preventDefault();
  setSlashKey((k) => k + 1);
  setMessage("");

  const data = new FormData(e.currentTarget);
  const email = String(data.get("email") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  const name = String(data.get("fullName") || email.split("@")[0] || "Friend");

  try {
    const endpoint = isSignup ? "signup" : "login";

    const response = await fetch(
      `http://localhost:5000/api/auth/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isSignup
            ? { name, email, password }
            : { email, password }
        ),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.message || "Something went wrong");
      return;
    }

    if (isSignup) {
      setMessage("Account created successfully 💚");

      setTimeout(() => {
        setIsSignup(false);
        setMessage("Account created! Login with your credentials 💚");
      }, 1500);

      return;
    }

    // REAL LOGIN SUCCESS
    setMessage("Login successful 💚");

    const loggedInName = result.user.name;
    const loggedInEmail = result.user.email;

    setTimeout(() => {
      if (onLogin) onLogin(loggedInName, loggedInEmail);
      else if (onBack) onBack();
    }, 350);

  } catch (error) {
    setMessage("Cannot connect to server. Check your backend 💔");
  }
};

  return (
    <div className="login-page" ref={pageRef}>
      <canvas className="login-particles" ref={canvasRef} />

      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />
      <div className="login-scanlines" />
      <div className="login-slash login-slash-a" />
      <div className="login-slash login-slash-b" />
      {slashKey > 0 && <div key={slashKey} className="login-slash-flash" />}


      <div className="login-layout">
        <div className="login-left">
          <div className="login-kicker">
            <span className="live-dot" />
            NO EXCUSES. NO LIMITS.
          </div>

          <h1 className="login-glitch" data-text="BREAK YOUR LIMITS.">
            BREAK<br />
            YOUR<br />
            <span>LIMITS.</span>
          </h1>

          <p>
            Train in silence. Let the results speak. Every rep is a
            decision you make for the person you are becoming.
          </p>

          <div className="login-features">
            <div><span>01</span> BUILD STRENGTH</div>
            <div><span>02</span> TRACK PROGRESS</div>
            <div><span>03</span> STAY RELENTLESS</div>
          </div>
        </div>

        <div className="login-card">
          <span className="login-corner tl" />
          <span className="login-corner tr" />
          <span className="login-corner bl" />
          <span className="login-corner br" />

          <div className="login-logo">
            <span className="brand-mark">F</span>
            <span>FIT<span>BRO.</span></span>
          </div>

          <div className="login-heading">
            <div className="eyebrow">
              {isSignup ? "ENTER THE ARENA" : "WELCOME BACK"}
            </div>

            <h2>
              {isSignup ? "CREATE YOUR" : "LET'S GET"}<br />
              <span>{isSignup ? "ACCOUNT." : "STRONGER."}</span>
            </h2>

            <p>
              {isSignup
                ? "Create an account and start your fitness journey."
                : "Your next level starts with showing up."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <label className="login-field">
                FULL NAME
                <input type="text" name="fullName" placeholder="Enter your name" required />
              </label>
            )}

            <label className="login-field">
              EMAIL ADDRESS
              <input type="email" name="email" placeholder="Enter your email" required />
            </label>

            <label className="login-field">
              PASSWORD
              <div className="login-password">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </label>

            {!isSignup && (
              <div className="login-options">
                <label>
                  <input type="checkbox" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setMessage("Password reset requires backend setup.")
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button className="login-submit" type="submit">
              {isSignup ? "CREATE ACCOUNT" : "LOGIN NOW"}
              <span>↗</span>
            </button>

            {message && <p className="login-message">{message}</p>}
          </form>

          <div className="login-switch">
            {isSignup ? "Already have an account?" : "New to FIT BRO?"}
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setMessage("");
              }}
            >
              {isSignup ? "LOGIN" : "SIGN UP"}
            </button>
          </div>

          <div className="login-bottom">DISCIPLINE OVER MOTIVATION ✦</div>
        </div>
      </div>
    </div>
  );
}

export default Login;