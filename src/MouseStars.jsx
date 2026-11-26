import React, { useEffect, useRef } from "react";
import "./mouse-stars.css";

/**
 * <MouseStars /> - full-screen stars that react to the mouse,
 * plus red embers and a white slash trail.
 * It is drawn on a fixed canvas over the whole window, so it does not
 * depend on any parent element or background. Clicks pass through it.
 */
export default function MouseStars({
  count = 90,
  color = "255,70,70",
  repelRadius = 140,
  parallax = 22,
  showTrail = true,
  showEmbers = true,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let stars = [];
    let sparks = [];
    let trail = [];
    let px = 0;
    let py = 0;
    const mouse = { x: -9999, y: -9999, nx: 0, ny: 0 };

    const makeStars = () => {
      stars = Array.from({ length: count }, () => {
        const depth = Math.random() * 0.8 + 0.2;
        const hx = Math.random() * w;
        const hy = Math.random() * h;
        return {
          hx, hy, x: hx, y: hy, vx: 0, vy: 0,
          r: depth * 1.8 + 0.4,
          depth,
          tw: Math.random() * Math.PI * 2,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
    };

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.nx = (e.clientX / w) * 2 - 1;
      mouse.ny = (e.clientY / h) * 2 - 1;

      if (showTrail) {
        trail.push({ x: mouse.x, y: mouse.y, life: 1 });
        if (trail.length > 28) trail.shift();
      }
      if (showEmbers) {
        sparks.push({
          x: mouse.x,
          y: mouse.y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          r: Math.random() * 2 + 0.8,
          life: 1,
        });
        if (sparks.length > 200) sparks.splice(0, sparks.length - 200);
      }
    };

    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.nx = 0;
      mouse.ny = 0;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      px += (mouse.nx * -parallax - px) * 0.06;
      py += (mouse.ny * -parallax - py) * 0.06;

      for (const s of stars) {
        s.hy -= 0.08 * s.depth;
        if (s.hy < -10) {
          s.hy = h + 10;
          s.hx = Math.random() * w;
        }

        s.vx += (s.hx + px * s.depth - s.x) * 0.03;
        s.vy += (s.hy + py * s.depth - s.y) * 0.03;

        const dx = s.x - mouse.x;
        const dy = s.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < repelRadius && dist > 0.01) {
          const force = (1 - dist / repelRadius) * 2.4;
          s.vx += (dx / dist) * force;
          s.vy += (dy / dist) * force;
        }

        s.vx *= 0.88;
        s.vy *= 0.88;
        s.x += s.vx;
        s.y += s.vy;

        s.tw += 0.03;
        const alpha = Math.min(
          0.55 + 0.45 * (0.5 + 0.5 * Math.sin(s.tw)) * s.depth,
          1
        );

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.shadowBlur = 10 * s.depth;
        ctx.shadowColor = `rgb(${color})`;
        ctx.fill();
      }

      for (const p of sparks) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${Math.max(p.life, 0)})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = `rgb(${color})`;
        ctx.fill();
      }
      sparks = sparks.filter((p) => p.life > 0);

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
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw(); // one static frame, no movement
    } else {
      window.addEventListener("pointermove", onMove);
      document.addEventListener("pointerleave", onLeave);
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [count, color, repelRadius, parallax, showTrail, showEmbers]);

  return <canvas className="mouse-stars" ref={canvasRef} />;
}
