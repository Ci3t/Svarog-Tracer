import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

const BLOOD_SLASH_SVG =
  "data:image/svg+xml;utf8,<svg width='400' height='60' viewBox='0 0 400 60' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M0 55L40 45L120 48L280 12L360 8L400 2L350 18L180 32L60 52L0 60Z' fill='%23ff0033' fill-opacity='0.78'/><circle cx='45' cy='42' r='2' fill='%23ff0033' fill-opacity='0.56'/><circle cx='180' cy='28' r='1.5' fill='%23ff0033' fill-opacity='0.78'/><circle cx='350' cy='12' r='2.5' fill='%23ff0033' fill-opacity='0.5'/></svg>";

const CrimsonBloom = () => {
  const layerRef = useRef(null);
  const mainGroupRef = useRef(null);
  const mainSlashRef = useRef(null);
  const miniGroupRef = useRef(null);
  const baseUrl = import.meta.env.BASE_URL;

  useEffect(() => {
    const layer = layerRef.current;
    const mainGroup = mainGroupRef.current;
    const mainSlash = mainSlashRef.current;
    const miniGroup = miniGroupRef.current;
    if (!layer || !mainGroup || !mainSlash || !miniGroup) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = reduceMotion ? 1.9 : 1;

    const ctx = gsap.context(() => {
      gsap.set(layer, { opacity: 0.62 });
      gsap.set([mainGroup, miniGroup, mainSlash], {
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

      gsap.to(mainSlash, {
        rotation: -360,
        duration: 20 * speed,
        ease: "none",
        repeat: -1,
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
            opacity: 0.54,
            filter: "saturate(1.28) contrast(1.08) brightness(0.82)",
          }}
        />
        <div
          ref={mainSlashRef}
          style={{
            position: "absolute",
            inset: "-8%",
            backgroundImage: `url(${BLOOD_SLASH_SVG})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            opacity: 0.24,
            mixBlendMode: "screen",
            filter: "drop-shadow(0 0 10px rgba(255, 0, 51, 0.28))",
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
