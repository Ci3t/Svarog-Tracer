import React, { useEffect, useRef } from 'react';

const VoidPetals = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const particleCount = reduceMotion
      ? 18
      : Math.max(26, Math.min(56, Math.floor(window.innerWidth / 34)));

    class Petal {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * -window.innerHeight;
        this.size = Math.random() * 4.6 + 3.2;
        this.depth = Math.random() * 0.55 + 0.45;
        this.speedX = (Math.random() * 0.16 - 0.08) * this.depth;
        this.speedY = (Math.random() * 0.65 + 0.5) * this.depth;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * (reduceMotion ? 0.004 : 0.012);
        this.opacity = Math.random() * 0.22 + 0.16;
        this.sway = Math.random() * 0.003 + 0.0015;
        this.swayOffset = Math.random() * Math.PI * 2;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * this.sway + this.swayOffset) * 0.18;
        this.rotation += this.rotationSpeed;

        return this.y <= window.innerHeight + 24 && this.x >= -28 && this.x <= window.innerWidth + 28;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        
        const gradient = ctx.createLinearGradient(0, -this.size, 0, this.size);
        gradient.addColorStop(0, '#ff8fa6');
        gradient.addColorStop(0.52, '#ff335b');
        gradient.addColorStop(1, '#b3002d');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-this.size * 0.65, -this.size * 0.9, -this.size * 0.7, this.size * 0.65, 0, this.size * 0.95);
        ctx.bezierCurveTo(this.size * 0.7, this.size * 0.65, this.size * 0.65, -this.size * 0.9, 0, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(120, 0, 25, 0.42)';
        ctx.lineWidth = 0.45;
        ctx.moveTo(0, this.size * 0.12);
        ctx.lineTo(0, this.size * 0.72);
        ctx.stroke();

        ctx.restore();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      const p = new Petal();
      p.y = Math.random() * canvas.height;
      particles.push(p);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i += 1) {
        const petal = particles[i];
        const isVisible = petal.update();
        if (!isVisible) {
          particles[i] = new Petal();
          particles[i].y = -20;
          particles[i].x = Math.random() * window.innerWidth;
          continue;
        }
        petal.draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        opacity: 0.48,
      }}
    />
  );
};

export default VoidPetals;
