// lib/playroom.ts
import { insertCoin, isHost, myPlayer } from "playroomkit";

export async function startPlayroom() {
  await insertCoin({
    skipLobby: true, // Bypasses the default Playroom UI
    maxPlayersPerRoom: 4, // Limits the game to a 4-player squad
    
  });

  return {
    player: myPlayer(),
    host: isHost(),
  };
}
