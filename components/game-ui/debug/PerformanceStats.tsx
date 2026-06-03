"use client";

import { motion } from "framer-motion";
import { myPlayer } from "playroomkit";
import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui/card";

export default function PerformanceStats() {
  const player = myPlayer();

  const [fps, setFps] = useState(0);
  const [ping, setPing] = useState(0);

  const frames = useRef(0);
  const lastUpdate = useRef(0);

  useEffect(() => {
    lastUpdate.current = performance.now();

    let animationId: number;

    const updateFPS = () => {
      frames.current++;

      const now = performance.now();

      if (now - lastUpdate.current >= 500) {
        const currentFps = Math.round(
          (frames.current * 1000) / (now - lastUpdate.current),
        );

        setFps(currentFps);

        frames.current = 0;
        lastUpdate.current = now;
      }

      animationId = requestAnimationFrame(updateFPS);
    };

    updateFPS();

    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const latency = (player as any)?._connection?.ping ?? 0;

        setPing(Math.round(latency));
      } catch {
        setPing(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player]);

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
      }}
      className="
        fixed
        left-0
        top-0
        z-[9999]
        pointer-events-none
        scale-80
        
      "
      
    >
      <Card
        className="
          border-none
          rounded-2xl
          bg-gradient-to-b
          from-[#202020]
          to-[#191919]
          px-4
          py-3
          text-white
          backdrop-blur-xl
          shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000060,0_0px_6px_0px_#00000060]
        "
      >
        <div className="flex flex-col gap-2 font-mono">
          {/* FPS */}
          <div
            className="
              flex
              items-center
              justify-between
              gap-6
              rounded-xl
              bg-[#111111]
              px-3
              py-2
              shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]
            "
          >
            <span className="text-xs tracking-widest text-white/45">FPS</span>

            <motion.span
              key={fps}
              initial={{
                scale: 0.92,
                opacity: 0.6,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: 0.15,
              }}
              className={`text-sm font-semibold ${
                fps >= 55
                  ? "text-green-400"
                  : fps >= 30
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {fps}
            </motion.span>
          </div>

          {/* Ping */}
          <div
            className="
              flex
              items-center
              justify-between
              gap-6
              rounded-xl
              bg-[#111111]
              px-3
              py-2
              shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]
            "
          >
            <span className="text-xs tracking-widest text-white/45">PING</span>

            <motion.span
              key={ping}
              initial={{
                scale: 0.92,
                opacity: 0.6,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: 0.15,
              }}
              className={`text-sm font-semibold ${
                ping <= 60
                  ? "text-green-400"
                  : ping <= 120
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {ping}ms
            </motion.span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}


