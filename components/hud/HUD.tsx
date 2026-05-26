"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Keyboard } from "lucide-react";
import { useEffect, useState } from "react";

const controls = [
  ["W A S D", "Move"],
  ["SHIFT", "Sprint"],
  ["SPACE", "Jump"],
  ["MOUSE", "Camera"],
];

export default function HUD() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // toggle with Shift + ?
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "?") {
        setOpen((prev) => !prev);
        setShowHint(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // auto hide hint
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowHint(false);
    }, 8000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {/* CONTROLS PANEL */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.96,
            }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 20,
            }}
            className="
              absolute
              bottom-5
              left-1/2
              w-[calc(100vw-24px)]
              max-w-[720px]
              -translate-x-1/2
              px-2
              sm:px-0
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[30px]
                border
                border-white/5
                bg-gradient-to-b
                from-[#202020]
                to-[#191919]
                p-3
                backdrop-blur-xl
                shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff20_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000080,0_0px_6px_0px_#00000060]
              "
            >
              {/* TOP */}
              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-between
                  rounded-2xl
                  bg-[#111111]
                  px-4
                  py-3
                  shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      size-11
                      items-center
                      justify-center
                      rounded-2xl
                      bg-gradient-to-b
                      from-[#202020]
                      to-[#191919]
                      shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff20_inset,0_10px_10px_-9px_#00000070]
                    "
                  >
                    <Keyboard className="size-5 text-white/70" />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white/85">
                      Controls
                    </div>

                    <div className="text-xs text-white/35">
                      Press Shift + ? to toggle
                    </div>
                  </div>
                </div>

                <div
                  className="
                    rounded-xl
                    bg-[#0f0f0f]
                    px-3
                    py-1.5
                    font-mono
                    text-xs
                    text-white/50
                    shadow-[0_0.5px_0_#ffffff15,0_2px_6px_#00000090_inset]
                  "
                >
                  SHIFT + ?
                </div>
              </div>

              {/* CONTROLS */}
              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                  sm:grid-cols-4
                "
              >
                {controls.map(([key, label]) => (
                  <motion.div
                    key={key}
                    whileHover={{
                      y: -1,
                    }}
                    className="
                      rounded-2xl
                      bg-[#111111]
                      p-3
                      shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]
                    "
                  >
                    <div
                      className="
                        text-[10px]
                        tracking-[0.2em]
                        text-white/35
                      "
                    >
                      {label}
                    </div>

                    <div
                      className="
                        mt-2
                        font-mono
                        text-sm
                        font-semibold
                        text-white/85
                        sm:text-base
                      "
                    >
                      {key}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING HINT */}
      <AnimatePresence>
        {!open && showHint && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 10,
            }}
            transition={{
              duration: 0.25,
            }}
            className="
              absolute
              bottom-5
              left-1/2
              -translate-x-1/2
            "
          >
            <motion.div
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-white/5
                bg-gradient-to-b
                from-[#202020]
                to-[#191919]
                px-4
                py-2
                backdrop-blur-xl
                shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff20_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000080]
              "
            >
              <ChevronUp className="size-4 text-white/40" />

              <span className="text-xs text-white/50 sm:text-sm">Press</span>

              <div
                className="
                  rounded-lg
                  bg-[#111111]
                  px-2
                  py-1
                  font-mono
                  text-xs
                  text-white/80
                  shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]
                "
              >
                SHIFT + ?
              </div>

              <span className="text-xs text-white/50 sm:text-sm">
                for controls
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
