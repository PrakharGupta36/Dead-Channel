"use client";

import { useGameStore } from "@/store/useGameStore";
import { useEffect, useRef, useState } from "react";

/**
 * Crosshair
 *
 * - Pure DOM overlay — zero R3F / Three.js overhead
 * - Visible only when pointer lock is active
 * - Flashes red on confirmed hit (watches useGameStore.hitEvents)
 * - Drop this directly inside your game wrapper div, as a sibling of <Canvas>
 *
 *   <div style={{ position: "relative" }}>
 *     <Canvas ... />
 *     <Crosshair />
 *   </div>
 */
export default function Crosshair() {
  const [locked, setLocked] = useState(false);
  const [hit, setHit] = useState(false);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitEvents = useGameStore((s) => s.hitEvents);
  const prevHitLen = useRef(0);

  // Track pointer lock
  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  // Flash red when a new hit registers
  useEffect(() => {
    if (hitEvents.length > prevHitLen.current) {
      prevHitLen.current = hitEvents.length;
      setHit(true);
      if (hitTimer.current) clearTimeout(hitTimer.current);
      hitTimer.current = setTimeout(() => setHit(false), 180);
    }
  }, [hitEvents]);

  if (!locked) return null;

  const c = hit ? "#ff3333" : "rgba(255,255,255,0.92)";
  const gap = 5; // px gap from center to each bar
  const len = 10; // px length of each bar
  const thick = 2; // px thickness

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Center dot */}
      <div
        style={{
          position: "absolute",
          width: thick,
          height: thick,
          borderRadius: "50%",
          background: c,
          boxShadow: hit ? `0 0 6px ${c}` : "none",
          transition: "background 0.05s, box-shadow 0.05s",
        }}
      />

      {/* Top */}
      <div
        style={{
          position: "absolute",
          width: thick,
          height: len,
          background: c,
          top: `calc(50% - ${gap + len}px)`,
          left: `calc(50% - ${thick / 2}px)`,
          boxShadow: `0 0 3px rgba(0,0,0,0.6)`,
          transition: "background 0.05s",
        }}
      />

      {/* Bottom */}
      <div
        style={{
          position: "absolute",
          width: thick,
          height: len,
          background: c,
          top: `calc(50% + ${gap}px)`,
          left: `calc(50% - ${thick / 2}px)`,
          boxShadow: `0 0 3px rgba(0,0,0,0.6)`,
          transition: "background 0.05s",
        }}
      />

      {/* Left */}
      <div
        style={{
          position: "absolute",
          width: len,
          height: thick,
          background: c,
          left: `calc(50% - ${gap + len}px)`,
          top: `calc(50% - ${thick / 2}px)`,
          boxShadow: `0 0 3px rgba(0,0,0,0.6)`,
          transition: "background 0.05s",
        }}
      />

      {/* Right */}
      <div
        style={{
          position: "absolute",
          width: len,
          height: thick,
          background: c,
          left: `calc(50% + ${gap}px)`,
          top: `calc(50% - ${thick / 2}px)`,
          boxShadow: `0 0 3px rgba(0,0,0,0.6)`,
          transition: "background 0.05s",
        }}
      />
    </div>
  );
}
