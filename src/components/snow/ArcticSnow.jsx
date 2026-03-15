import React, { useEffect, useRef } from 'react';

export default function ArcticSnow({ particleCount = 130, speedScale = 0.65 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const snowflakes = ['❄', '❅', '❆'];
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const isEmoji = Math.random() > 0.6; // 40% emojis, 60% dots
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        originX: Math.random() * width,
        size: isEmoji ? Math.random() * 8 + 6 : Math.random() * 2 + 1,
        speed: (Math.random() * 1.5 + 0.3) * speedScale,
        opacity: Math.random() * 0.6 + 0.1,
        wobbleSpeed: Math.random() * 0.05 + 0.01,
        wobbleRadius: Math.random() * 30 + 10,
        wobblePhase: Math.random() * Math.PI * 2,
        rotation: isEmoji ? Math.random() * Math.PI * 2 : 0,
        rotationSpeed: isEmoji ? (Math.random() - 0.5) * 0.02 : 0,
        isEmoji: isEmoji,
        emojiVal: isEmoji ? snowflakes[Math.floor(Math.random() * snowflakes.length)] : null
      });
    }

    let animationFrameId;

    const update = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach(p => {
        p.y += p.speed;
        p.wobblePhase += p.wobbleSpeed;
        p.x = p.originX + Math.sin(p.wobblePhase) * p.wobbleRadius;
        
        if (p.isEmoji) {
          p.rotation += p.rotationSpeed;
        }

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
          p.originX = p.x;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.isEmoji) {
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(125, 211, 252, ${p.opacity * 0.8})`; // ice-blue tint
          ctx.font = `${p.size}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowBlur = p.size * 1.5;
          ctx.shadowColor = 'rgba(103, 232, 249, 0.4)';
          ctx.fillText(p.emojiVal, 0, 0);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(103, 232, 249, ${p.opacity})`; // aurora-cyan
          ctx.shadowBlur = p.size * 3;
          ctx.shadowColor = 'rgba(103, 232, 249, 0.6)';
          ctx.fill();
        }
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [particleCount, speedScale]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
