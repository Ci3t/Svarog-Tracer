import React, { useEffect, useRef } from 'react';

/**
 * SnowEffect - A high-performance canvas-based snowfall component.
 * @param {number} density - Number of snowflakes (default 100)
 * @param {number} speed - Vertical fall speed multiplier (default 1)
 */
export default function SnowEffect({ density = 100, speed = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let snowflakes = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const createSnowflakes = () => {
      snowflakes = [];
      for (let i = 0; i < density; i++) {
        snowflakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 3 + 1,
          speed: (Math.random() * 1 + 0.5) * speed,
          wind: Math.random() * 0.5 - 0.25,
          opacity: Math.random() * 0.5 + 0.3
        });
      }
    };

    const update = () => {
      ctx.clearRect(0, 0, width, height);
      
      snowflakes.forEach(flake => {
        flake.y += flake.speed;
        flake.x += flake.wind;

        if (flake.y > height) {
          flake.y = -flake.radius;
          flake.x = Math.random() * width;
        }
        if (flake.x > width) flake.x = 0;
        if (flake.x < 0) flake.x = width;

        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(update);
    };

    window.addEventListener('resize', resize);
    resize();
    createSnowflakes();
    update();

    return () => window.removeEventListener('resize', resize);
  }, [density, speed]);

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5]"
      style={{ filter: 'blur(1px)' }}
    />
  );
}
