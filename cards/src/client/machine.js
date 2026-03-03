import { setup, assign, fromCallback } from "https://esm.sh/xstate@5";
import { interpretServerState, buildClientView } from "./actions.js";

export const clientMachine = setup({
  actors: {
    watchPlayerDoc: fromCallback(({ input, sendBack }) => {
      let previousPhase = null;
      return input.syncController.watchMyDoc(input.lobbyCode, input.playerId, (doc) => {
        sendBack({ type: "SERVER_UPDATE", playerDoc: doc, previousPhase });
        previousPhase = doc.phase;
      });
    }),
  },
  guards: {
    isGameStarted: ({ event }) =>
      interpretServerState(event.playerDoc, event.previousPhase).event === "GAME_STARTED",
    isJudgingAsJudge: ({ event }) =>
      interpretServerState(event.playerDoc, event.previousPhase).event === "ROUND_CLOSED_AS_JUDGE",
    isJudgingAsPlayer: ({ event }) =>
      interpretServerState(event.playerDoc, event.previousPhase).event === "JUDGING_STARTED",
    isResultsReceived: ({ event }) =>
      interpretServerState(event.playerDoc, event.previousPhase).event === "RESULTS_RECEIVED",
    isGameOver: ({ event }) =>
      interpretServerState(event.playerDoc, event.previousPhase).event === "GAME_OVER",
    isNewRound: ({ event }) =>
      interpretServerState(event.playerDoc, event.previousPhase).event === "GAME_STARTED",
  },
  actions: {
    storePlayerDoc: assign({
      playerDoc: ({ event }) => event.playerDoc,
    }),
    saveLastRound: assign({
      lastRound: ({ context }) => ({
        currentPrompt: context.playerDoc?.currentPrompt || null,
        submissionsToJudge: context.playerDoc?.submissionsToJudge || [],
        message: context.playerDoc?.message || "",
      }),
    }),
  },
}).createMachine({
  id: "client",
  initial: "landing",
  context: ({ input }) => ({
    syncController: input.syncController,
    lobbyCode: input.lobbyCode || null,
    playerId: input.playerId || null,
    playerDoc: null,
    lastRound: null,
  }),
  states: {
    landing: {
      on: {
        LOBBY_JOINED: {
          target: "lobby",
          actions: assign({
            lobbyCode: ({ event }) => event.lobbyCode,
            playerId: ({ event }) => event.playerId,
          }),
        },
        LOBBY_CREATED: {
          target: "lobby",
          actions: assign({
            lobbyCode: ({ event }) => event.lobbyCode,
            playerId: ({ event }) => event.playerId,
          }),
        },
      },
    },
    lobby: {
      invoke: {
        src: "watchPlayerDoc",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
          playerId: context.playerId,
        }),
      },
      on: {
        SERVER_UPDATE: [
          {
            guard: "isGameStarted",
            target: "picking",
            actions: "storePlayerDoc",
          },
          {
            actions: "storePlayerDoc",
          },
        ],
      },
    },
    picking: {
      invoke: {
        src: "watchPlayerDoc",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
          playerId: context.playerId,
        }),
      },
      on: {
        ANSWER_SUBMITTED: "submitted",
        SERVER_UPDATE: [
          {
            guard: "isJudgingAsJudge",
            target: "judgingActive",
            actions: "storePlayerDoc",
          },
          {
            guard: "isJudgingAsPlayer",
            target: "judgingWaiting",
            actions: "storePlayerDoc",
          },
          {
            actions: "storePlayerDoc",
          },
        ],
      },
    },
    submitted: {
      invoke: {
        src: "watchPlayerDoc",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
          playerId: context.playerId,
        }),
      },
      on: {
        SERVER_UPDATE: [
          {
            guard: "isJudgingAsPlayer",
            target: "judgingWaiting",
            actions: "storePlayerDoc",
          },
          {
            actions: "storePlayerDoc",
          },
        ],
      },
    },
    judgingWaiting: {
      invoke: {
        src: "watchPlayerDoc",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
          playerId: context.playerId,
        }),
      },
      on: {
        SERVER_UPDATE: [
          {
            guard: "isResultsReceived",
            target: "postJudging",
            actions: "storePlayerDoc",
          },
          {
            actions: "storePlayerDoc",
          },
        ],
      },
    },
    judgingActive: {
      invoke: {
        src: "watchPlayerDoc",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
          playerId: context.playerId,
        }),
      },
      on: {
        WINNER_PICKED: "postJudging",
        SERVER_UPDATE: [
          {
            guard: "isResultsReceived",
            target: "postJudging",
            actions: "storePlayerDoc",
          },
          {
            actions: "storePlayerDoc",
          },
        ],
      },
    },
    postJudging: {
      invoke: {
        src: "watchPlayerDoc",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
          playerId: context.playerId,
        }),
      },
      on: {
        SERVER_UPDATE: [
          {
            guard: "isGameOver",
            target: "gameOver",
            actions: "storePlayerDoc",
          },
          {
            guard: "isNewRound",
            target: "nextRoundReady",
            actions: ["saveLastRound", "storePlayerDoc"],
          },
          {
            actions: "storePlayerDoc",
          },
        ],
      },
    },
    nextRoundReady: {
      invoke: {
        src: "watchPlayerDoc",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
          playerId: context.playerId,
        }),
      },
      on: {
        PLAYER_JOINED_ROUND: "picking",
        SERVER_UPDATE: [
          {
            guard: "isGameOver",
            target: "gameOver",
            actions: "storePlayerDoc",
          },
          {
            actions: "storePlayerDoc",
          },
        ],
      },
    },
    gameOver: {},
  },
});
