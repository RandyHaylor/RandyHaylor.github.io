// -- Client state interpretation --
// Translates server phase + player context into client state events.

export function interpretServerState(playerDoc) {
  const phase = playerDoc.phase;
  const isJudge = playerDoc.isJudge;

  if (phase === "lobby") return { event: null };
  if (phase === "round-active") return { event: "GAME_STARTED" };
  if (phase === "judging" && isJudge) return { event: "ROUND_CLOSED_AS_JUDGE" };
  if (phase === "judging" && !isJudge) return { event: "JUDGING_STARTED" };
  if (phase === "judged") return { event: "RESULTS_RECEIVED" };
  if (phase === "game-over") return { event: "GAME_OVER" };

  return { event: null };
}

export function buildClientView(clientState, playerDoc) {
  return {
    state: clientState,
    players: playerDoc.players || [],
    hand: playerDoc.hand || [],
    currentPrompt: playerDoc.currentPrompt,
    isJudge: playerDoc.isJudge || false,
    score: playerDoc.score || 0,
    message: playerDoc.message || "",
  };
}
