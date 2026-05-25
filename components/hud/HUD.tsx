"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { useState } from "react";

import ControlsCard from "./ControlsCard";

export default function HUD() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {/* TOGGLE BUTTON */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.03 }}
        onClick={() => setOpen((prev) => !prev)}
        className="
          pointer-events-auto
          absolute
          bottom-5
          right-5
          size-14
          rounded-[22px]
          flex
          items-center
          justify-center
          bg-gradient-to-b
          from-[#202020]
          to-[#191919]
          border
          border-white/5
          shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff20_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000080,0_0px_6px_0px_#00000060]
          cursor-pointer
        "
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={20} className="text-white/80" />
            </motion.div>
          ) : (
            <motion.div
              key="info"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Info size={20} className="text-white/80" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* DIALOG */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.96,
            }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 20,
            }}
            className="absolute bottom-24 right-5"
          >
            <ControlsCard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
