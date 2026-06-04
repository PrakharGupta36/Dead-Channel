"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { isHost, useMultiplayerState, usePlayersList } from "playroomkit";

interface GameOverOverlayProps {
  winnerName?: string;
}

// 1. Move static styles completely out of the component to prevent object allocation on render
const styles = {
  container: {
    position: "fixed",
    inset: 0,
    zIndex: 999999,
    overflow: "hidden",
    userSelect: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    willChange: "transform, opacity", // Hint compositor optimization
  },
  darkOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.82)",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.95) 100%)",
  },
  glowContainer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  glowNode: {
    position: "absolute",
    left: "50%",
    top: "42%",
    width: "1200px",
    height: "700px",
    transform: "translate3d(-50%, -50%, 0)", // GPU Accelerated 3D layer
    borderRadius: "9999px",
    background: "rgba(180,20,20,0.35)",
    filter: "blur(180px)",
  },
  grain: {
    position: "absolute",
    inset: 0,
    opacity: 0.05,
    pointerEvents: "none",
    backgroundImage:
      "repeating-radial-gradient(circle at 0 0, white 0px, transparent 2px)",
    backgroundSize: "6px 6px",
    transform: "translateZ(0)", // Force composite layer
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  headerGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    lineHeight: 0.78,
  },
  winnerGroup: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  divider: {
    width: 120,
    height: 1,
    background: "#404040",
  },
  winnerText: {
    color: "#e4e4e7",
    fontSize: "24px",
    fontWeight: 800,
    letterSpacing: "8px",
    textTransform: "uppercase",
  },
  warningText: {
    marginTop: 16,
    color: "#f87171",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  buttonGroup: {
    marginTop: 48,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  waitingBadge: {
    width: 480,
    height: 60,
    border: "2px solid #3f3f46",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#71717a",
    fontWeight: 800,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  leaveButton: {
    width: 480,
    height: 60,
    border: "2px solid #52525b",
    background: "transparent",
    color: "#d4d4d8",
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 4,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  footer: {
    position: "absolute",
    right: 32,
    bottom: 24,
    display: "flex",
    gap: 32,
    color: "#71717a",
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
} as const;

// Inline static sub-components to protect typography layers from unnecessary re-renders
const StaticBackground = React.memo(() => (
  <>
    <div style={styles.darkOverlay} />
    <div style={styles.vignette} />
  </>
));
StaticBackground.displayName = "StaticBackground";

const StaticHeader = React.memo(() => (
  <div style={styles.headerGroup}>
    <h1
      style={{
        margin: 0,
        padding: 0,
        color: "#ffffff",
        fontSize: "clamp(120px, 15vw, 260px)",
        fontWeight: 900,
        letterSpacing: "-0.08em",
        textTransform: "uppercase",
        textShadow:
          "0 0 20px rgba(255,255,255,.15), 0 6px 20px rgba(0,0,0,.8), 0 20px 60px rgba(0,0,0,.95)",
      }}
    >
      GAME
    </h1>
    <h1
      style={{
        margin: "-20px 0 0 0",
        padding: 0,
        color: "#dc2626",
        fontSize: "clamp(120px, 15vw, 260px)",
        fontWeight: 900,
        letterSpacing: "-0.08em",
        textTransform: "uppercase",
        textShadow:
          "0 0 30px rgba(220,38,38,.7), 0 0 60px rgba(220,38,38,.4), 0 6px 20px rgba(0,0,0,.8), 0 20px 60px rgba(0,0,0,.95)",
      }}
    >
      OVER
    </h1>
  </div>
));
StaticHeader.displayName = "StaticHeader";

export default function GameOverOverlay({
  winnerName = "UNKNOWN",
}: GameOverOverlayProps) {
  // Playroom state initializations
  const players = usePlayersList();
  const [, setMatchState] = useMultiplayerState("matchState", "ENDED");
  const [, setWinnerName] = useMultiplayerState("winnerName", "");
  const [startingCount] = useMultiplayerState("startingPlayerCount", 1);

  // Cached Host evaluation
  const host = useMemo(() => isHost(), []);

  const currentPlayerCount = players.length;
  const isPlayerCountValid = currentPlayerCount === startingCount;

  useEffect(() => {
    document.exitPointerLock?.();
    window.focus();
  }, []);

  // Use useCallback to maintain referential identity across renders
  const handleRestart = useCallback(() => {
    if (!host || !isPlayerCountValid) return;

    players.forEach((player) => {
      player.setState("kills", 0);
      player.setState("health", 100);
      player.setState("position", [0, 0.5, 0]);
    });

    setWinnerName("");
    setMatchState("PLAYING");
  }, [host, isPlayerCountValid, players, setMatchState, setWinnerName]);

  const handleLeave = useCallback(() => {
    window.location.href = window.location.origin + window.location.pathname;
  }, []);

  // Compute dynamic button styles ahead of rendering layout
  const restartButtonStyle = useMemo(
    () => ({
      width: 480,
      height: 60,
      border: isPlayerCountValid ? "2px solid #ef4444" : "2px solid #3f3f46",
      background: isPlayerCountValid
        ? "rgba(239,68,68,0.08)"
        : "rgba(0,0,0,0.2)",
      color: isPlayerCountValid ? "#f87171" : "#71717a",
      fontWeight: 900,
      fontSize: 16,
      letterSpacing: 4,
      textTransform: "uppercase" as const,
      cursor: isPlayerCountValid ? "pointer" : "not-allowed",
      boxShadow: isPlayerCountValid ? "0 0 40px rgba(220,38,38,0.25)" : "none",
      transition: "all 0.2s ease",
    }),
    [isPlayerCountValid],
  );

  return (
    <div style={styles.container}>
      <StaticBackground />

      {/* RED GLOW: Switched from scale to transform3d scale properties to maintain 60FPS on GPU */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          transform: [
            "translate3d(-50%, -50%, 0) scale(1)",
            "translate3d(-50%, -50%, 0) scale(1.08)",
            "translate3d(-50%, -50%, 0) scale(1)",
          ],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={styles.glowContainer}
      >
        <div style={styles.glowNode} />
      </motion.div>

      {/* FILM GRAIN */}
      <div style={styles.grain} />

      {/* CONTENT */}
      <motion.div
        initial={{ opacity: 0, scale: 1.08, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.content}
      >
        <StaticHeader />

        {/* WINNER */}
        <div style={styles.winnerGroup}>
          <div style={styles.divider} />
          <div style={styles.winnerText}>{winnerName} WINS</div>
          <div style={styles.divider} />
        </div>

        {/* WARNING */}
        {!isPlayerCountValid && (
          <div style={styles.warningText}>PLAYER COUNT CHANGED</div>
        )}

        {/* BUTTONS */}
        <div style={styles.buttonGroup}>
          {host ? (
            <button
              onClick={handleRestart}
              disabled={!isPlayerCountValid}
              style={restartButtonStyle}
            >
              RESTART MATCH
            </button>
          ) : (
            <div style={styles.waitingBadge}>WAITING FOR HOST</div>
          )}

          <button onClick={handleLeave} style={styles.leaveButton}>
            LEAVE LOBBY
          </button>
        </div>
      </motion.div>

    </div>
  );
}
