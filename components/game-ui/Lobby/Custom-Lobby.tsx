"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  isHost,
  myPlayer,
  PlayerState,
  setState,
  useMultiplayerState,
} from "playroomkit";
import { useEffect, useState } from "react";

import { backdropVariants } from "./animations/variants";
import EmptyPlayer from "./components/Empty-Player";
import LeftPanel from "./components/Left-Panel";
import PlayerCard from "./components/Player-Card";
import RenameModal from "./components/Rename-Modal";
import StartButton from "./components/Start-Button";
import { useRealTimePlayers } from "./hooks/useRealtimePlayers";

interface CustomLobbyProps {
  onGameStart: () => void;
}

export default function CustomLobby({ onGameStart }: CustomLobbyProps) {
  const players = useRealTimePlayers();

  const [objective, setObjective] = useState<string>("20_kills");
  const [copied, setCopied] = useState(false);
  const [startReady, setStartReady] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const host = isHost();
  const me = myPlayer();

  const [gameStarted] = useMultiplayerState("gameStarted", false);

  useEffect(() => {
    if (gameStarted) {
      onGameStart();
    }
  }, [gameStarted, onGameStart]);

  const handleStartGame = () => {
    if (!host) return;
    setStartReady(true);
    setTimeout(() => {
      setState("gameObjective", objective);
      setState("gameStarted", true);
    }, 200);
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenameCommit = (name: string) => {
    const currentPlayer = myPlayer(); // pull fresh reference
    if (!currentPlayer) return;

    currentPlayer.setState("customName", name);
    setShowRenameModal(false);
  };

  const isMe = (p: PlayerState) => me && p.id === me.id;

  const displayName = (p: PlayerState) =>
    (p.getState("customName") as string | undefined) ?? p.getProfile().name;

  const emptySlots = Math.max(0, 4 - players.length);

  const currentPlayerName = me ? displayName(me) : "";

  return (
    <>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        className="
          fixed inset-0 z-50 flex flex-col overflow-y-auto
          bg-[#0f0f0f] text-zinc-100 font-sans select-none
          before:absolute before:inset-0
          before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_40%)]
          before:pointer-events-none
        "
      >
        <main
          className="
          flex-1 w-full max-w-400 mx-auto
          px-3 sm:px-6 lg:px-8 py-3 sm:py-5 lg:py-8
          flex flex-col lg:grid lg:grid-cols-12
          gap-3 sm:gap-4 lg:gap-8 z-10
        "
        >
          {/* LEFT PANEL */}
          <LeftPanel
            paramsOpen={paramsOpen}
            setParamsOpen={setParamsOpen}
            copied={copied}
            objective={objective}
            setObjective={setObjective}
            copyInviteLink={copyInviteLink}
          />

          {/* CENTER */}
          <section className="lg:col-span-9 flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between px-1 sm:px-2">
              <span className="text-sm font-mono bg-zinc-800/50 text-zinc-300 px-2 py-2 rounded-md font-bold border border-zinc-700/50 grow text-center">
                {players.length} / 4 READY
              </span>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <AnimatePresence mode="popLayout">
                {players.map((p) => {
                  const mine = isMe(p);

                  return (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      mine={mine}
                      displayName={displayName(p)}
                      onRename={() => setShowRenameModal(true)}
                    />
                  );
                })}

                {Array.from({ length: emptySlots }).map((_, i) => (
                  <EmptyPlayer key={`empty-${i}`} index={i} />
                ))}
              </AnimatePresence>
            </div>

            {/* Start button */}
            <StartButton
              host={host}
              startReady={startReady}
              playersCount={players.length}
              onStart={handleStartGame}
            />
          </section>

          <AnimatePresence>
            {showRenameModal && (
              <RenameModal
                currentName={me ? displayName(me) : "Loading..."}
                onCommit={handleRenameCommit}
                onCancel={() => setShowRenameModal(false)}
              />
            )}
          </AnimatePresence>
        </main>
      </motion.div>
    </>
  );
}
