import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { renameModalVariants } from "../animations/variants";

interface RenameModalProps {
  currentName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

export default function RenameModal({
  currentName,
  onCommit,
  onCancel,
}: RenameModalProps) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX = 20;

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) onCommit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onCancel();
  };

  const remaining = MAX - value.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onCancel}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <motion.div
        variants={renameModalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-sm
          bg-gradient-to-b from-[#1e1e1e] to-[#171717]
          border border-[#2e2e2e] rounded-2xl overflow-hidden
          shadow-[0_0_0_1px_#ffffff08_inset,0_32px_64px_rgba(0,0,0,0.8)]
        "
      >
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
            <svg
              className="w-3.5 h-3.5 text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-500 uppercase">
              Callsign Override
            </p>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Set your display name
            </p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX))}
              onKeyDown={handleKeyDown}
              maxLength={MAX}
              placeholder="Enter callsign..."
              className="
                w-full h-14
                bg-[#0d0d0d] rounded-xl
                border border-zinc-800
                px-4 pr-14
                font-mono font-bold text-base text-zinc-100
                placeholder:text-zinc-700
                outline-none caret-red-400
                focus:border-red-500/50
                focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]
                transition-all duration-150
                shadow-[0_2px_8px_rgba(0,0,0,0.6)_inset]
              "
            />
            <div
              className={`
              absolute right-3 top-1/2 -translate-y-1/2
              px-1.5 py-0.5 rounded-md
              font-mono text-[10px] font-bold tabular-nums
              transition-colors duration-150
              ${
                remaining <= 4
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-zinc-800/80 text-zinc-600 border border-zinc-700/50"
              }
            `}
            >
              {remaining}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="
                flex-1 h-11 rounded-xl
                bg-zinc-900 border border-zinc-800
                font-mono text-xs font-bold uppercase tracking-widest
                text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800
                transition-all duration-150 active:scale-[0.97]
              "
            >
              Cancel
            </button>
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim()}
              whileTap={{ scale: 0.97 }}
              className="
                flex-[2] h-11 rounded-xl
                bg-gradient-to-b from-red-600 to-red-700
                border border-red-500/40
                font-mono text-xs font-black uppercase tracking-[0.18em]
                text-white
                shadow-[0_1px_0_#ff000030_inset,0_-1px_0_#00000050_inset,0_4px_20px_rgba(220,38,38,0.25)]
                hover:shadow-[0_1px_0_#ff000030_inset,0_-1px_0_#00000050_inset,0_4px_24px_rgba(220,38,38,0.4)]
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              Confirm
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
