import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function SilverWolf999Backdrop({ image = "999SW.png" }) {
  const baseUrl = import.meta.env.BASE_URL;
  const scopeRef = useRef(null);

  useEffect(() => {
    if (!scopeRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set(".sw-999-layer-1", {
        xPercent: -50,
        yPercent: -50,
        skewX: -18,
        rotate: -14,
        scale: 0.74,
        opacity: 0.035,
      });
      gsap.set(".sw-999-layer-2", {
        xPercent: -50,
        yPercent: -50,
        skewX: -14,
        rotate: -10,
        scale: 0.96,
        opacity: 0.05,
      });
      gsap.set(".sw-999-layer-3", {
        xPercent: -50,
        yPercent: -50,
        skewX: -10,
        rotate: -6,
        scale: 1.24,
        opacity: 0.08,
      });

      gsap.to(".sw-999-layer-1", {
        y: "-=26",
        x: "+=10",
        rotate: "-=2.5",
        opacity: 0.06,
        duration: 8.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".sw-999-layer-2", {
        y: "-=30",
        x: "+=8",
        rotate: "-=2.25",
        opacity: 0.08,
        duration: 9.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".sw-999-layer-3", {
        y: "-=28",
        x: "+=12",
        rotate: "-=1.75",
        opacity: 0.12,
        duration: 9.1,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".sw-999-layer-3", {
        scale: 1.2,
        duration: 5.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }, scopeRef);

    return () => ctx.revert();
  }, [image]);

  return (
    <div ref={scopeRef} className="sw-999-global" aria-hidden="true">
      <img src={`${baseUrl}${image}`} alt="" className="sw-999-layer sw-999-layer-1" />
      <img src={`${baseUrl}${image}`} alt="" className="sw-999-layer sw-999-layer-2" />
      <img src={`${baseUrl}${image}`} alt="" className="sw-999-layer sw-999-layer-3" />

      <style>{`
        .sw-999-global {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .sw-999-layer {
          position: absolute;
          top: 64%;
          height: auto;
          object-fit: contain;
          mix-blend-mode: normal;
          will-change: transform, opacity;
          filter: saturate(1.05) contrast(1.02) brightness(0.52) drop-shadow(0 0 12px rgba(0,243,255,0.12));
          transform-origin: center center;
          pointer-events: none;
        }
        .sw-999-layer-1 {
          left: 56%;
          width: min(10vw, 160px);
        }
        .sw-999-layer-2 {
          left: 60%;
          width: min(14vw, 250px);
        }
        .sw-999-layer-3 {
          left: 69%;
          width: min(22vw, 400px);
        }
        @media (max-width: 900px) {
          .sw-999-layer {
            top: 67%;
          }
          .sw-999-layer-1 {
            left: 53%;
            width: min(14vw, 120px);
          }
          .sw-999-layer-2 {
            left: 59%;
            width: min(20vw, 170px);
          }
          .sw-999-layer-3 {
            left: 68%;
            width: min(30vw, 250px);
          }
        }
      `}</style>
    </div>
  );
}
