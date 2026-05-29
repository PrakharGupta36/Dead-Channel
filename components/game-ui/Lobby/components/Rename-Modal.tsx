"use client";

import { memo, useEffect, useRef, useState } from "react";

interface RenameModalProps {
  currentName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

function RenameModal({ currentName, onCommit, onCancel }: RenameModalProps) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX = 20;
  const remaining = MAX - value.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();

    if (!trimmed) return;

    onCommit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div
      onClick={onCancel}
      className="
        fixed inset-0 z-[120]

        flex items-center justify-center

        p-4 sm:p-6

        bg-black/60
        backdrop-blur-md
      "
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-sm

          overflow-hidden

          rounded-2xl
          border border-zinc-800/80

          bg-zinc-950/95

          shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]

          p-1
        "
      >
        {/* Header */}
        <div
          className="
            flex items-center gap-3

            px-5 pt-5 pb-4

            border-b border-zinc-800
          "
        >
          <div
            className="
              flex h-9 w-9 shrink-0
              items-center justify-center

              rounded-lg

               border-red-500/20
              bg-red-500/10
            "
          >
            <svg
              className="h-4 w-4 text-red-400"
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
            <h2
              className="
                text-sm
                font-black
                uppercase
                tracking-[0.2em]

                text-zinc-100
              "
            >
              Rename
            </h2>

            <p
              className="
                mt-1

                text-xs
                font-mono

                text-zinc-400
              "
            >
              Set your display name
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pt-4">
          <div className="relative">
            <input
              ref={inputRef}
              autoFocus
              value={value}
              maxLength={MAX}
              placeholder="Enter callsign..."
              onKeyDown={handleKeyDown}
              onChange={(e) => setValue(e.target.value)}
              className="
                h-12
                w-full

                rounded-xl

                border border-zinc-800
                bg-zinc-900

                px-4
                pr-14

                font-mono
                text-sm
                font-bold

                text-zinc-100
                placeholder:text-zinc-600

                outline-none

                transition-all duration-200

                focus:border-red-500/40
                focus:bg-zinc-900/90
                focus:shadow-[0_0_0_1px_rgba(239,68,68,0.15)]
              "
            />

            <span
              className={`
                absolute right-3 top-1/2 -translate-y-1/2

                rounded-md

                px-1.5 py-0.5

                text-[10px]
                font-mono
                font-bold

                ${remaining <= 4 ? "text-red-400" : "text-zinc-500"}
              `}
            >
              {remaining}
            </span>
          </div>

          <div className="my-5 h-px bg-zinc-800/80" />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="
                flex-1

                h-11

                rounded-xl

                border border-zinc-800
                bg-zinc-900

                font-mono
                text-xs
                font-bold

                uppercase
                tracking-widest

                text-zinc-400

                transition-all duration-200

                hover:bg-zinc-800
                hover:text-zinc-200
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="
                flex-1

                h-11

                rounded-xl

                bg-red-600

                font-mono
                text-xs
                font-black

                uppercase
                tracking-[0.18em]

                text-white

                transition-all duration-200

                hover:bg-red-500

                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(RenameModal);
