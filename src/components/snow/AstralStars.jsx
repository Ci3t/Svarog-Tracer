import React, { useEffect, useRef } from 'react';

/**
 * AstralStars
 * A multi-layered parallax starfield with occasional shooting stars.
 */
const AstralStars = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;
    
    const stars = [];
    const shootingStars = [];
    
    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      const warpSpeed = 7;
      
      // Keep the field lighter so it reads as motion, not heavy rain.
      const numStars = Math.max(90, Math.floor((width * height) / 3600));
      stars.length = 0;
      
      for (let i = 0; i < numStars; i++) {
        const layer = Math.random() < 0.6 ? 1 : Math.random() < 0.9 ? 2 : 3;
        
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: layer === 1 ? Math.random() * 0.6 + 0.2 : layer === 2 ? Math.random() * 0.9 + 0.5 : Math.random() * 1.4 + 0.8,
          // Stronger leftward travel keeps the streaks diagonal behind the train.
          speedY: (layer === 1 ? 0.22 : layer === 2 ? 0.4 : 0.75) * warpSpeed,
          speedX: (layer === 1 ? -0.35 : layer === 2 ? -0.7 : -1.2) * warpSpeed,
          opacity: layer === 1 ? Math.random() * 0.18 + 0.08 : layer === 2 ? Math.random() * 0.25 + 0.2 : Math.random() * 0.3 + 0.35,
          layer
        });
      }
    };
    
    const addShootingStar = () => {
      if (Math.random() < 0.012 && shootingStars.length < 1) {
        shootingStars.push({
          x: width + Math.random() * width * 0.35,
          y: -80 + Math.random() * height * 0.25,
          length: Math.random() * 80 + 55,
          speed: Math.random() * 10 + 18,
          angle: (Math.PI / 4) + (Math.random() * 0.2 - 0.1),
          opacity: 1,
          decay: Math.random() * 0.02 + 0.018
        });
      }
    };
    
    const update = () => {
      // Slight motion blur by not fully clearing or using low alpha
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw background stars
      stars.forEach(star => {
        // Move stars
        star.x += star.speedX;
        star.y += star.speedY;
        
        // Wrap around with buffer
        if (star.x < -120) star.x = width + 120;
        if (star.y > height + 120) star.y = -120;
        
        const currentOpacity = star.opacity;
        ctx.fillStyle = `rgba(226, 232, 240, ${currentOpacity})`;
        
        // Motion blur stretch for closer stars
        if (star.layer >= 2) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(226, 232, 240, ${currentOpacity * 0.5})`;
          ctx.lineWidth = star.size;
          ctx.lineCap = 'round';
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x - star.speedX * 0.28, star.y - star.speedY * 0.28);
          ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Add and draw shooting stars
      addShootingStar();
      
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        
        s.x -= Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= s.decay;
        
        if (s.opacity <= 0 || s.x < -120 || s.y > height + 120) {
          shootingStars.splice(i, 1);
          continue;
        }
        
        // Draw shooting star line
        ctx.beginPath();
        
        // Gradient for the tail
        const gradient = ctx.createLinearGradient(
          s.x, s.y, 
          s.x + Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length
        );
        gradient.addColorStop(0, `rgba(251, 191, 36, ${s.opacity})`); // Gold head
        gradient.addColorStop(0.1, `rgba(226, 232, 240, ${s.opacity * 0.5})`); // Silver body
        gradient.addColorStop(1, 'rgba(226, 232, 240, 0)'); // Faded tail
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length);
        ctx.stroke();
      }
      
      animationFrameId = requestAnimationFrame(update);
    };
    
    init();
    update();
    
    // Handle resize
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        init();
      }, 200);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen', zIndex: 1 }}
    />
  );
};

export default AstralStars;
