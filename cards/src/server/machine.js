import { setup, assign, fromCallback } from "https://esm.sh/xstate@5";
import {
  createLobby,
  syncAllPlayerDocs,
  buildPlayerList,
  addPlayer,
  isNameTaken,
  markPlayerReady,
  allPlayersReady,
  validateSettings,
  shuffleArray,
  dealHands,
  assignJudge,
  startRound,
  recordSubmission,
  allNonJudgeSubmitted,
  processDiscards,
  processSubmissions,
  topUpHands,
  assembleSubmissions,
  awardPoint,
  setJudgedPhase,
  hasPlayerWon,
  rotateJudgeIndex,
  removePlayer,
  adjustJudgeIndex,
} from "./actions.js";

// TODO: Once live, any new game created also looks at existing lobby docs,
// grabs player 1 last update timestamp for each, deletes that lobby doc
// if timestamp is over 48 hours old.
// DO NOT DO THIS UNTIL I EXPLICITLY SAY TO.
function generateLobbyCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const serverMachine = setup({
  actors: {
    watchPlayersCollection: fromCallback(({ input, sendBack }) => {
      return input.syncController.watchPlayers(input.lobbyCode, sendBack);
    }),
  },
  guards: {
    nameNotTaken: ({ context, event }) => !isNameTaken(context.players, event.name),
    allPlayersReady: ({ context }) => context.players.length >= 2 && allPlayersReady(context.players),
    allNonJudgeSubmitted: ({ context, event }) => {
      const updated = recordSubmission(
        context.players, event.playerId, event.submission, event.discardRequests
      );
      return allNonJudgeSubmitted(updated);
    },
    hasPlayerWon: ({ context }) => hasPlayerWon(context.players, context.settings.scoreToWin),
  },
  actions: {
    createLobby: ({ context }) => {
      createLobby(context.syncController, context.lobbyCode);
    },
    addPlayerToContext: assign({
      players: ({ context, event }) =>
        addPlayer(context.players, event.playerId, event.name, event.isHost || false),
    }),
    setPlayerReady: assign({
      players: ({ context, event }) =>
        markPlayerReady(context.players, event.playerId),
    }),
    storeSettings: assign({
      settings: ({ event }) => validateSettings(event.settings, event.schema),
    }),
    storeDeck: assign({
      deck: ({ event }) => ({
        prompts: shuffleArray(event.deck.prompts),
        answers: shuffleArray(event.deck.answers),
      }),
    }),
    dealHands: assign(({ context }) => {
      const result = dealHands(context.players, context.deck.answers, context.settings.handSize);
      return {
        players: result.players,
        deck: { ...context.deck, answers: result.remainingAnswers },
      };
    }),
    assignJudge: assign({
      players: ({ context }) => assignJudge(context.players, context.judgeIndex),
    }),
    drawPromptAndStartRound: assign(({ context }) => {
      const prompt = context.deck.prompts[context.promptIndex];
      return {
        players: startRound(context.players, prompt),
        promptIndex: context.promptIndex + 1,
      };
    }),
    recordSubmission: assign({
      players: ({ context, event }) =>
        recordSubmission(context.players, event.playerId, event.submission, event.discardRequests),
    }),
    processRoundEnd: assign(({ context }) => {
      let players = processDiscards(context.players);
      players = processSubmissions(players);
      const result = topUpHands(players, context.deck.answers, context.settings.handSize);
      const submissions = assembleSubmissions(context.players);
      return {
        players: result.players,
        deck: { ...context.deck, answers: result.remainingAnswers },
        submissions,
      };
    }),
    setJudgingPhase: assign({
      players: ({ context }) => {
        const judgeName = context.players.find((p) => p.isJudge)?.name || "";
        return context.players.map((p) => ({
          ...p,
          phase: "judging",
          message: p.isJudge ? "" : `${judgeName} is reviewing submissions.`,
          submissionsToJudge: p.isJudge ? context.submissions : [],
          clientUpdates: {
            playerReady: false,
            submission: null,
            discardRequests: null,
          },
        }));
      },
    }),
    awardPoint: assign({
      players: ({ context, event }) =>
        awardPoint(context.players, event.winnerId),
    }),
    setJudgedPhase: assign({
      players: ({ context, event }) =>
        setJudgedPhase(context.players, context.submissions, event.winnerId),
    }),
    rotateJudge: assign(({ context }) => ({
      judgeIndex: rotateJudgeIndex(context.judgeIndex, context.players.length),
    })),
    setGameOverPhase: assign({
      players: ({ context }) => {
        const winner = context.players.reduce((a, b) => (a.score > b.score ? a : b));
        const playerList = buildPlayerList(context.players);
        return context.players.map((p) => ({
          ...p,
          phase: "game-over",
          message: `${winner.name} wins the game!`,
          players: playerList,
        }));
      },
    }),
    syncPlayerDocs: ({ context }) => {
      syncAllPlayerDocs(context.syncController, context.lobbyCode, context.players);
    },
    removePlayerFromContext: assign(({ context, event }) => ({
      players: removePlayer(context.players, event.playerId),
      judgeIndex: adjustJudgeIndex(context.judgeIndex, context.players, event.playerId),
    })),
    deleteKickedPlayerDoc: ({ context, event }) => {
      context.syncController.deletePlayerDoc(context.lobbyCode, event.playerId);
    },
    incrementRoundNumber: assign({
      roundNumber: ({ context }) => context.roundNumber + 1,
    }),
    logRoundToHistory: ({ context, event }) => {
      const judge = context.players.find((p) => p.isJudge);
      const prompt = context.players[0]?.currentPrompt || null;
      context.syncController.logRound(context.lobbyCode, {
        roundNumber: context.roundNumber,
        timestamp: Date.now(),
        prompt,
        judgeName: judge?.name || "",
        submissions: context.submissions.map((s) => ({
          playerName: s.playerName,
          playerId: s.playerId,
          answer: s.card,
          isWinner: s.playerId === event.winnerId,
          selectedBy: s.playerId === event.winnerId ? (judge?.name || "") : null,
        })),
        scoresAfterRound: context.players.map((p) => ({
          name: p.name,
          score: p.score,
        })),
      });
    },
  },
}).createMachine({
  id: "server",
  initial: "lobby",
  context: ({ input }) => ({
    syncController: input.syncController,
    lobbyCode: input.lobbyCode || generateLobbyCode(),
    deckId: input.deckId || "",
    settings: null,
    players: [],
    deck: null,
    judgeIndex: 0,
    promptIndex: 0,
    roundNumber: 0,
    submissions: [],
  }),
  states: {
    lobby: {
      entry: "createLobby",
      invoke: {
        src: "watchPlayersCollection",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
        }),
      },
      on: {
        ADD_PLAYER: {
          guard: "nameNotTaken",
          actions: ["addPlayerToContext", "syncPlayerDocs"],
        },
        PLAYER_JOINED: {
          guard: "nameNotTaken",
          actions: ["addPlayerToContext", "syncPlayerDocs"],
        },
        PLAYER_READY: {
          actions: ["setPlayerReady", "syncPlayerDocs"],
        },
        START_GAME: {
          guard: "allPlayersReady",
          target: "roundActive",
          actions: ["storeSettings", "storeDeck", "dealHands", "assignJudge", "incrementRoundNumber", "drawPromptAndStartRound", "syncPlayerDocs"],
        },
        KICK_PLAYER: {
          actions: ["removePlayerFromContext", "deleteKickedPlayerDoc", "syncPlayerDocs"],
        },
      },
    },
    roundActive: {
      invoke: {
        src: "watchPlayersCollection",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
        }),
      },
      on: {
        PLAYER_SUBMITTED: [
          {
            guard: "allNonJudgeSubmitted",
            target: "judging",
            actions: ["recordSubmission", "processRoundEnd", "setJudgingPhase", "syncPlayerDocs"],
          },
          {
            actions: ["recordSubmission", "syncPlayerDocs"],
          },
        ],
        KICK_PLAYER: {
          actions: ["removePlayerFromContext", "deleteKickedPlayerDoc", "syncPlayerDocs"],
        },
        FORCE_NEXT_ROUND: {
          target: "roundActive",
          actions: ["rotateJudge", "assignJudge", "incrementRoundNumber", "drawPromptAndStartRound", "syncPlayerDocs"],
        },
      },
    },
    judging: {
      invoke: {
        src: "watchPlayersCollection",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
        }),
      },
      on: {
        PICK_WINNER: {
          target: "judged",
          actions: ["awardPoint", "logRoundToHistory", "setJudgedPhase", "syncPlayerDocs"],
        },
        KICK_PLAYER: {
          actions: ["removePlayerFromContext", "deleteKickedPlayerDoc", "syncPlayerDocs"],
        },
        FORCE_NEXT_ROUND: {
          target: "roundActive",
          actions: ["rotateJudge", "assignJudge", "incrementRoundNumber", "drawPromptAndStartRound", "syncPlayerDocs"],
        },
      },
    },
    judged: {
      invoke: {
        src: "watchPlayersCollection",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
        }),
      },
      on: {
        NEXT_ROUND: [
          {
            guard: "hasPlayerWon",
            target: "gameOver",
            actions: ["setGameOverPhase", "syncPlayerDocs"],
          },
          {
            target: "roundActive",
            actions: ["rotateJudge", "assignJudge", "incrementRoundNumber", "drawPromptAndStartRound", "syncPlayerDocs"],
          },
        ],
        KICK_PLAYER: {
          actions: ["removePlayerFromContext", "deleteKickedPlayerDoc", "syncPlayerDocs"],
        },
        FORCE_NEXT_ROUND: [
          {
            guard: "hasPlayerWon",
            target: "gameOver",
            actions: ["setGameOverPhase", "syncPlayerDocs"],
          },
          {
            target: "roundActive",
            actions: ["rotateJudge", "assignJudge", "incrementRoundNumber", "drawPromptAndStartRound", "syncPlayerDocs"],
          },
        ],
      },
    },
    gameOver: {},
  },
});
