import React, { useEffect, useRef } from "react";

const COLORS = ["#00f3ff", "#bc00ff", "#6bff1f", "#f3ff00"];
const PARTICLE_COUNT = 84;

const random = (min, max) => Math.random() * (max - min) + min;

function createParticle(width, height) {
  const isBinary = Math.random() > 0.35;
  return {
    x: random(0, width),
    y: random(0, height),
    size: random(1.6, 4.2),
    speedX: random(16, 44),
    floatY: random(-0.2, 0.2),
    opacity: random(0.16, 0.48),
    phase: random(0, Math.PI * 2),
    char: Math.random() > 0.5 ? "0" : "1",
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    isBinary,
  };
}

const AetherEffect = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(width, height)
      );
    };

    const drawHexGrid = (timeMs) => {
      const baseY = height * 0.66;
      const hexSize = 34;
      const rowHeight = hexSize * 0.86;
      const colWidth = hexSize * 1.5;
      const drift = ((timeMs * 0.006) % colWidth) * -1;

      ctx.save();
      ctx.strokeStyle = "rgba(0, 243, 255, 0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let row = -1; row < 8; row += 1) {
        const y = baseY + row * rowHeight;
        const rowOffset = row % 2 === 0 ? 0 : colWidth * 0.5;
        for (let x = -colWidth; x < width + colWidth; x += colWidth) {
          const cx = x + rowOffset + drift;
          ctx.moveTo(cx, y);
          ctx.lineTo(cx + hexSize * 0.5, y - hexSize * 0.32);
          ctx.lineTo(cx + hexSize * 1.1, y - hexSize * 0.32);
          ctx.lineTo(cx + hexSize * 1.6, y);
          ctx.lineTo(cx + hexSize * 1.1, y + hexSize * 0.32);
          ctx.lineTo(cx + hexSize * 0.5, y + hexSize * 0.32);
          ctx.closePath();
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawScanBand = (timeMs) => {
      const y = ((timeMs * 0.04) % (height + 120)) - 60;
      ctx.save();
      const gradient = ctx.createLinearGradient(0, y, 0, y + 38);
      gradient.addColorStop(0, "rgba(0, 243, 255, 0)");
      gradient.addColorStop(0.45, "rgba(0, 243, 255, 0.12)");
      gradient.addColorStop(1, "rgba(0, 243, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, width, 38);
      ctx.restore();
    };

    const updateAndDrawParticles = (dt, timeMs) => {
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const influenceX = (mouse.x - width / 2) * 0.00045;
        const influenceY = (mouse.y - height / 2) * 0.00028;

        p.x -= (p.speedX + influenceX * 24) * dt;
        p.y += Math.sin(timeMs * 0.0015 + p.phase) * p.floatY * 6 + influenceY * 2;

        if (p.x < -36) {
          particles[i] = {
            ...createParticle(width, height),
            x: width + random(10, 80),
            y: random(0, height),
          };
          continue;
        }

        if (p.y < -24) p.y = height + 24;
        if (p.y > height + 24) p.y = -24;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.isBinary) {
          ctx.font = `${p.size * 2.5}px "JetBrains Mono", monospace`;
          ctx.fillText(p.char, p.x, p.y);
        } else {
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }

        ctx.restore();
      }
    };

    const render = (timeMs) => {
      const lastTime = lastTimeRef.current || timeMs;
      const dt = Math.min((timeMs - lastTime) / 1000, 0.04);
      lastTimeRef.current = timeMs;

      ctx.clearRect(0, 0, width, height);
      drawHexGrid(timeMs);
      updateAndDrawParticles(dt, timeMs);
      drawScanBand(timeMs);

      rafRef.current = requestAnimationFrame(render);
    };

    const onMouseMove = (event) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};

export default AetherEffect;
