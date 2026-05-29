"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface MatchProtectionOptions {
  enabled: boolean;
  onDisconnect?: () => void;
}

export function useMatchProtection({
  enabled,
  onDisconnect,
}: MatchProtectionOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      onDisconnect?.();

      e.preventDefault();
      e.returnValue = "";

      return "";
    };

    const handlePageHide = () => {
      onDisconnect?.();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isRefresh =
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r");

      if (isRefresh) {
        e.preventDefault();

        toast.warning("Match in Progress", {
          description:
            "Refreshing will disconnect you from the game and may result in elimination.",
          duration: 4000,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onDisconnect]);
}
