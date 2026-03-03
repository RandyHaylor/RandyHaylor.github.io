export async function joinLobby(syncController, lobbyCode, playerId, name) {
  return syncController.joinLobby(lobbyCode, playerId, name);
}

export function setPlayerReady(syncController, lobbyCode, playerId) {
  syncController.setPlayerReady(lobbyCode, playerId);
}

export function submitAnswer(syncController, lobbyCode, playerId, submission, discardRequests) {
  syncController.submitAnswer(lobbyCode, playerId, submission, discardRequests);
}

export function pickWinner(syncController, lobbyCode, playerId, winnerId) {
  syncController.pickWinner(lobbyCode, playerId, winnerId);
}

export function startNextRound(syncController, lobbyCode, playerId) {
  syncController.startNextRound(lobbyCode, playerId);
}
