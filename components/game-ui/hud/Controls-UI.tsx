"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";

const controls = [
  ["WASD", "Move"],
  ["SHIFT", "Sprint"],
  ["SPACE", "Jump"],
  ["MOUSE", "Look"],
];

export default function ControlsUI() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 3500);
    return () => clearTimeout(timer);
  }, [open]);

  // Toggle with ? or Shift+/
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isQuestionMark =
        e.key === "?" || (e.shiftKey && (e.key === "/" || e.code === "Slash"));
      if (isQuestionMark) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <AnimatePresence>
      {open && (
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
          style={{
            bottom:"10px"
          }}
          className="
        fixed
        right-2
        bottom-0
        z-[9999]
        pointer-events-none
        scale-85
        
      "
        >
          <Card
            className="
          border-none
          rounded-xl
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
            <div
              className="text-center text-xs relative bottom-2"
              style={{ paddingTop: "2px" }}
            >
              <h1> Controls </h1>
              <p className="text-white/50 " style={{ fontStyle: "italic" }}>
                {" "}
                Press (Shift + ?){" "}
              </p>
            </div>

            {controls.map(([key, action]) => (
              <div className="flex flex-col gap-2 font-mono" key={key}>
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
                  <span className="text-xs tracking-widest text-white/45">
                    {action}
                  </span>

                  <motion.span
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
                    className={`text-sm font-semibold `}
                  >
                    {key}
                  </motion.span>
                </div>
              </div>
            ))}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
