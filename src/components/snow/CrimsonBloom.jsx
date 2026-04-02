import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

const CrimsonBloom = () => {
  const layerRef = useRef(null);
  const mainGroupRef = useRef(null);
  const miniGroupRef = useRef(null);
  const baseUrl = import.meta.env.BASE_URL;

  useEffect(() => {
    const layer = layerRef.current;
    const mainGroup = mainGroupRef.current;
    const miniGroup = miniGroupRef.current;
    if (!layer || !mainGroup || !miniGroup) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = reduceMotion ? 1.9 : 1;

    const ctx = gsap.context(() => {
      gsap.set(layer, { opacity: 0.62 });
      gsap.set([mainGroup, miniGroup], {
        transformOrigin: "50% 50%",
      });

      gsap.to(layer, {
        opacity: 0.78,
        duration: 4.8 * speed,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      const mainTl = gsap.timeline({ repeat: -1, yoyo: true });
      mainTl
        .to(mainGroup, {
          x: -135,
          y: 74,
          rotation: 23,
          scale: 1.1,
          duration: 8.2 * speed,
          ease: "sine.inOut",
        })
        .to(mainGroup, {
          x: 36,
          y: -24,
          rotation: -14,
          scale: 0.97,
          duration: 7.6 * speed,
          ease: "sine.inOut",
        });

      gsap.to(miniGroup, {
        x: 84,
        y: 42,
        rotation: -30,
        scale: 1.08,
        duration: 7.2 * speed,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

    }, layer);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={layerRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <div
        ref={mainGroupRef}
        style={{
          position: "absolute",
          right: "-230px",
          bottom: "-170px",
          width: "min(66vw, 900px)",
        }}
      >
        <img
          src={`${baseUrl}acheron-flower.png`}
          alt=""
          style={{
            width: "100%",
            opacity: 0.5,
            filter: "saturate(1.18) contrast(1.04) brightness(0.82)",
          }}
        />
      </div>

      <div
        ref={miniGroupRef}
        style={{
          position: "absolute",
          left: "-130px",
          top: "8vh",
          width: "min(34vw, 460px)",
          transform: "scaleX(-1)",
        }}
      >
        <img
          src={`${baseUrl}acheron-flower.png`}
          alt=""
          style={{
            width: "100%",
            opacity: 0.3,
            filter: "saturate(1.22) contrast(1.02) brightness(0.8)",
          }}
        />
      </div>
    </div>
  );
};

export default CrimsonBloom;
