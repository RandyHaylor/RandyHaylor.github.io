// -- Sync operations (passthrough to sync controller) --

export function createLobby(syncController, lobbyCode) {
  return syncController.createLobby(lobbyCode);
}

export function syncAllPlayerDocs(syncController, lobbyCode, players) {
  return syncController.syncPlayerDocs(lobbyCode, players);
}

// -- Settings validation --

export function validateSettings(settings, schema) {
  const validated = {};
  for (const [key, rule] of Object.entries(schema.gameSettings)) {
    const value = settings?.[key];
    if (value === undefined || value === null) {
      validated[key] = rule.default;
      continue;
    }
    if (rule.enum && !rule.enum.includes(value)) {
      validated[key] = rule.default;
      continue;
    }
    if ((rule.type === "integer" || rule.type === "number") && typeof value === "number") {
      if (value < rule.min) { validated[key] = rule.min; continue; }
      if (value > rule.max) { validated[key] = rule.max; continue; }
      validated[key] = rule.type === "integer" ? Math.floor(value) : value;
      continue;
    }
    validated[key] = rule.default;
  }
  return validated;
}

// -- Pure game logic --

export function buildPlayerState(id, name, isHost) {
  return {
    id,
    name,
    isHost,
    score: 0,
    phase: "lobby",
    players: [],
    hand: [],
    currentPrompt: null,
    isJudge: false,
    message: "",
    submissionsToJudge: [],
    clientUpdates: {
      playerReady: false,
      submission: null,
      discardRequests: null,
    },
  };
}

export function buildPlayerList(players) {
  return players.map((p) => ({
    name: p.name,
    score: p.score,
    ready: p.clientUpdates.playerReady,
    isHost: p.isHost,
  }));
}

export function isNameTaken(players, name) {
  return players.some((p) => p.name.toLowerCase() === name.toLowerCase());
}

export function addPlayer(players, playerId, name, isHost) {
  const player = buildPlayerState(playerId, name, isHost);
  const allPlayers = [...players, player];
  const playerList = buildPlayerList(allPlayers);
  return allPlayers.map((p) => ({ ...p, players: playerList }));
}

export function markPlayerReady(players, playerId) {
  const updated = players.map((p) => {
    if (p.id === playerId) {
      return {
        ...p,
        clientUpdates: { ...p.clientUpdates, playerReady: true },
      };
    }
    return p;
  });
  const playerList = buildPlayerList(updated);
  return updated.map((p) => ({ ...p, players: playerList }));
}

export function allPlayersReady(players) {
  return players.length > 0 && players.every((p) => p.clientUpdates.playerReady);
}

// -- Round setup --

export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealHands(players, answerCards, handSize) {
  let cardIndex = 0;
  const updated = players.map((p) => {
    const hand = answerCards.slice(cardIndex, cardIndex + handSize);
    cardIndex += handSize;
    return { ...p, hand };
  });
  const remainingCards = answerCards.slice(cardIndex);
  return { players: updated, remainingAnswers: remainingCards };
}

export function assignJudge(players, judgeIndex) {
  const playerList = buildPlayerList(players);
  return players.map((p, i) => ({
    ...p,
    isJudge: i === judgeIndex,
    players: playerList,
  }));
}

export function startRound(players, prompt) {
  const playerList = buildPlayerList(players);
  return players.map((p) => ({
    ...p,
    phase: "round-active",
    currentPrompt: prompt,
    message: "",
    submissionsToJudge: [],
    players: playerList,
    clientUpdates: {
      playerReady: false,
      submission: null,
      discardRequests: null,
    },
  }));
}

// -- Submission processing --

export function recordSubmission(players, playerId, submission, discardRequests) {
  const updated = players.map((p) => {
    if (p.id === playerId) {
      return {
        ...p,
        clientUpdates: {
          ...p.clientUpdates,
          playerReady: true,
          submission,
          discardRequests: discardRequests || [],
        },
      };
    }
    return p;
  });
  const playerList = buildPlayerList(updated);
  return updated.map((p) => ({ ...p, players: playerList }));
}

export function allNonJudgeSubmitted(players) {
  return players
    .filter((p) => !p.isJudge)
    .every((p) => p.clientUpdates.submission !== null);
}

export function processDiscards(players) {
  return players.map((p) => {
    const discards = p.clientUpdates.discardRequests || [];
    if (discards.length === 0) return p;
    const hand = p.hand.filter((card) => !discards.includes(card.id));
    return { ...p, hand };
  });
}

export function processSubmissions(players) {
  return players.map((p) => {
    if (p.isJudge) return p;
    const submission = p.clientUpdates.submission;
    if (submission === null) return p;
    const hand = p.hand.filter((card) => card.id !== submission);
    return { ...p, hand };
  });
}

export function topUpHands(players, answerCards, handSize) {
  let cardIndex = 0;
  const updated = players.map((p) => {
    const needed = handSize - p.hand.length;
    if (needed <= 0) return p;
    const newCards = answerCards.slice(cardIndex, cardIndex + needed);
    cardIndex += needed;
    return { ...p, hand: [...p.hand, ...newCards] };
  });
  const remainingCards = answerCards.slice(cardIndex);
  return { players: updated, remainingAnswers: remainingCards };
}

export function assembleSubmissions(players) {
  const submissions = players
    .filter((p) => !p.isJudge && p.clientUpdates.submission !== null)
    .map((p) => {
      const cardId = p.clientUpdates.submission;
      const card = p.hand.find((c) => c.id === cardId);
      return {
        playerId: p.id,
        playerName: p.name,
        card: card ? card.text : cardId,
      };
    });
  return shuffleArray(submissions);
}

// -- Judging --

export function awardPoint(players, winnerId) {
  const updated = players.map((p) => {
    if (p.id === winnerId) {
      return { ...p, score: p.score + 1 };
    }
    return p;
  });
  const playerList = buildPlayerList(updated);
  return updated.map((p) => ({ ...p, players: playerList }));
}

export function setJudgedPhase(players, submissions, winnerId) {
  const winnerName = players.find((p) => p.id === winnerId)?.name || "";
  const resultsWithWinner = submissions.map((s) => ({
    ...s,
    isWinner: s.playerId === winnerId,
  }));
  return players.map((p) => ({
    ...p,
    phase: "judged",
    message: `${winnerName} wins this round!`,
    submissionsToJudge: resultsWithWinner,
    clientUpdates: {
      playerReady: false,
      submission: null,
      discardRequests: null,
    },
  }));
}

export function hasPlayerWon(players, scoreToWin) {
  return players.some((p) => p.score >= scoreToWin);
}

export function rotateJudgeIndex(judgeIndex, playerCount) {
  return (judgeIndex + 1) % playerCount;
}
