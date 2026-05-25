import { insertCoin, isHost, myPlayer } from "playroomkit";

export async function startPlayroom() {
  await insertCoin({
    gameId: "dead-channel",
    skipLobby: false,
  });

  return {
    player: myPlayer(),
    host: isHost(),
  };
}
