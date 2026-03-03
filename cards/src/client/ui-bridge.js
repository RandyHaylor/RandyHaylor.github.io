import { createActor } from "https://esm.sh/xstate@5";
import { clientMachine } from "./machine.js";
import { buildClientView } from "./actions.js";
import {
  joinLobby,
  setPlayerReady,
  submitAnswer,
  pickWinner,
  startNextRound,
} from "../player/actions.js";

export function createUIBridge(syncController) {
  let clientActor = null;
  let serverActor = null;
  let onChange = null;
  let lobbyCode = null;
  let playerId = null;
  let playerName = null;
  let isHost = false;

  function notify() {
    if (onChange) {
      onChange(getView());
    }
  }

  function getView() {
    if (!clientActor) {
      return {
        state: "landing",
        players: [],
        hand: [],
        currentPrompt: null,
        isJudge: false,
        isHost: false,
        score: 0,
        message: "",
        lobbyCode: null,
        playerName: null,
        submissions: [],
      };
    }
    const snap = clientActor.getSnapshot();
    const doc = snap.context.playerDoc;
    const lastRound = snap.context.lastRound;
    const useLastRound = snap.value === "nextRoundReady" && lastRound;
    return {
      state: snap.value,
      players: doc?.players || [],
      hand: doc?.hand || [],
      currentPrompt: useLastRound ? lastRound.currentPrompt : (doc?.currentPrompt || null),
      isJudge: doc?.isJudge || false,
      isHost,
      score: doc?.score || 0,
      message: useLastRound ? lastRound.message : (doc?.message || ""),
      lobbyCode,
      playerName,
      submissions: useLastRound ? lastRound.submissionsToJudge : (doc?.submissionsToJudge || []),
    };
  }

  function startClientActor() {
    clientActor = createActor(clientMachine, {
      input: { syncController, lobbyCode, playerId },
    });
    clientActor.subscribe(() => notify());
    clientActor.start();
  }

  return {
    onViewChange(callback) {
      onChange = callback;
    },

    getView,

    setServerActor(actor) {
      serverActor = actor;
      syncController.setServerActor(actor);
    },

    async createLobby(name, code) {
      playerName = name;
      playerId = "1";
      isHost = true;
      lobbyCode = code;

      const { serverMachine } = await import("../server/machine.js");
      const actor = createActor(serverMachine, {
        input: { syncController, lobbyCode },
      });
      actor.start();
      syncController.setServerActor(actor);
      serverActor = actor;

      actor.send({ type: "ADD_PLAYER", playerId: "1", name, isHost: true });
      syncController.writeHostPlayerDoc(lobbyCode, name);

      startClientActor();
      clientActor.send({ type: "LOBBY_CREATED", lobbyCode, playerId });
      return { ok: true, lobbyCode };
    },

    async joinLobby(code, id, name) {
      lobbyCode = code;
      playerId = id;
      playerName = name;
      isHost = false;

      const result = await joinLobby(syncController, code, id, name);
      if (result.error) return result;

      startClientActor();
      clientActor.send({ type: "LOBBY_JOINED", lobbyCode, playerId });
      return { ok: true };
    },

    readyUp() {
      setPlayerReady(syncController, lobbyCode, playerId);
    },

    startGame(deck, settings, schema) {
      if (!serverActor) return;
      serverActor.send({ type: "START_GAME", deck, settings, schema });
    },

    submitAnswer(cardId, discardIds) {
      submitAnswer(syncController, lobbyCode, playerId, cardId, discardIds || []);
      if (clientActor) {
        clientActor.send({ type: "ANSWER_SUBMITTED" });
      }
    },

    pickWinner(winnerId) {
      pickWinner(syncController, lobbyCode, playerId, winnerId);
      if (clientActor) {
        clientActor.send({ type: "WINNER_PICKED" });
      }
    },

    startNextRound() {
      if (serverActor) {
        startNextRound(syncController, lobbyCode, playerId);
      }
    },

    joinNextRound() {
      if (clientActor) {
        clientActor.send({ type: "PLAYER_JOINED_ROUND" });
      }
    },

    getServerActor() {
      return serverActor;
    },

    getClientActor() {
      return clientActor;
    },

    getLobbyCode() {
      return lobbyCode;
    },

    getPlayerId() {
      return playerId;
    },

    isPlayerHost() {
      return isHost;
    },

    stop() {
      if (clientActor) clientActor.stop();
      if (serverActor) serverActor.stop();
    },
  };
}
