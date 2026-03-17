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
      ? 14
      : Math.max(20, Math.min(40, Math.floor(window.innerWidth / 42)));

    class Petal {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * -window.innerHeight;
        this.size = Math.random() * 7 + 4;
        this.depth = Math.random() * 0.65 + 0.35;
        this.speedX = (Math.random() * 0.8 - 0.4) * this.depth;
        this.speedY = (Math.random() * 0.9 + 0.45) * this.depth;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * (reduceMotion ? 0.01 : 0.028);
        this.opacity = Math.random() * 0.35 + 0.24;
        this.curve = Math.random() * 0.01 + 0.004;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * this.curve) * (0.45 + this.depth * 0.35);
        this.rotation += this.rotationSpeed;

        if (this.y > window.innerHeight + 28 || this.x < -40 || this.x > window.innerWidth + 40) {
          this.reset();
          this.y = -28;
          this.x = Math.random() * window.innerWidth;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        
        const gradient = ctx.createLinearGradient(0, -this.size, 0, this.size);
        gradient.addColorStop(0, '#ff5e7d');
        gradient.addColorStop(0.5, '#ff0033');
        gradient.addColorStop(1, '#9d0022');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-this.size * 0.9, -this.size * 0.95, -this.size, this.size * 0.8, 0, this.size);
        ctx.bezierCurveTo(this.size, this.size * 0.8, this.size * 0.9, -this.size * 0.95, 0, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(90, 0, 18, 0.72)';
        ctx.lineWidth = 0.7;
        ctx.moveTo(0, this.size * 0.08);
        ctx.lineTo(0, this.size * 0.92);
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
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
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
        opacity: 0.74,
      }}
    />
  );
};

export default VoidPetals;
