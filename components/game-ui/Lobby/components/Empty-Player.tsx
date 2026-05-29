"use client";

import { UserPlus } from "lucide-react";
import { memo } from "react";

interface EmptyPlayerProps {
  index: number;
}

function EmptyPlayer({ index }: EmptyPlayerProps) {
  return (
    <div
      className="
        relative flex flex-col items-center justify-center

        p-3 sm:p-5
        min-h-[148px] sm:min-h-[184px]

        rounded-2xl

        bg-[#0e0e0e]/40
        border border-dashed border-zinc-800/80

        text-center

        shadow-md shadow-black/10
      "
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className="
            p-2 sm:p-3
            rounded-full

            bg-zinc-900/50
            border border-zinc-800/50

            text-zinc-600
          "
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <div>
          <span
            className="
              block
              text-[10px] sm:text-xs

              uppercase
              tracking-widest

              font-mono
              font-bold

              text-zinc-600
            "
          >
            Awaiting Connection
          </span>

          <span
            className="
              text-[9px] sm:text-[10px]

              font-mono

              text-zinc-700

              uppercase
              tracking-wider
            "
          >
            Slot Open
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(EmptyPlayer);
