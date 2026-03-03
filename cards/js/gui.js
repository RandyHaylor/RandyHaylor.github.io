import { createUIBridge } from "../src/client/ui-bridge.js";
import { createSyncController } from "../src/playerSyncController.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const app = initializeApp({
  projectId: "cardsagainstwhat",
  appId: "1:808328792842:web:59b83499d1323cf1ff88f3",
  apiKey: "AIzaSyBBqeRGVH08LhGl6NnTvX-J0Qr6iCnOOig",
  authDomain: "cardsagainstwhat.firebaseapp.com",
});
const db = getFirestore(app);

const bridge = createUIBridge(createSyncController(db));

// -- DOM references --
const $ = (id) => document.getElementById(id);

const topBar = $("top-bar");
const lobbyCodeBtn = $("lobby-code-btn");
const copyCodeBtn = $("copy-code-btn");
const copyLinkBtn = $("copy-link-btn");
const playerIcons = $("player-icons");
const hostMenu = $("host-menu");
const menuStartNext = $("menu-start-next");
const menuPlayerAdmin = $("menu-player-admin");
const menuEndGame = $("menu-end-game");
const confirmOverlay = $("confirm-overlay");
const confirmMessage = $("confirm-message");
const confirmYes = $("confirm-yes");
const confirmNo = $("confirm-no");
const playerAdminOverlay = $("player-admin-overlay");
const adminPlayerList = $("admin-player-list");
const adminClose = $("admin-close");

const viewLanding = $("view-landing");
const inputName = $("input-name");
const inputCode = $("input-code");
const btnCreate = $("btn-create");
const btnJoin = $("btn-join");
const landingError = $("landing-error");

const viewLobby = $("view-lobby");
const lobbyPlayerList = $("lobby-player-list");
const btnReady = $("btn-ready");
const btnStartGame = $("btn-start-game");

const viewPicking = $("view-picking");
const promptDisplay = $("prompt-display");
const handDisplay = $("hand-display");
const discardInfo = $("discard-info");
const btnSubmitAnswer = $("btn-submit-answer");

const viewSubmitted = $("view-submitted");
const viewJudgingWaiting = $("view-judging-waiting");
const judgeWaitingMsg = $("judge-waiting-msg");

const viewJudgingActive = $("view-judging-active");
const promptJudging = $("prompt-judging");
const subCard = $("sub-card");
const subPrev = $("sub-prev");
const subNext = $("sub-next");
const subCounter = $("sub-counter");
const btnPickWinner = $("btn-pick-winner");

const viewPostJudging = $("view-post-judging");
const promptResult = $("prompt-result");
const resultMessage = $("result-message");
const resCard = $("res-card");
const resPrev = $("res-prev");
const resNext = $("res-next");
const resCounter = $("res-counter");
const btnNextRound = $("btn-next-round");

const viewNextRound = $("view-next-round");
const promptNextRound = $("prompt-next-round");
const nextRoundMsg = $("next-round-msg");
const nrCard = $("nr-card");
const nrPrev = $("nr-prev");
const nrNext = $("nr-next");
const nrCounter = $("nr-counter");
const btnJoinRound = $("btn-join-round");

const viewGameOver = $("view-game-over");
const gameOverMsg = $("game-over-msg");
const finalScores = $("final-scores");

const allViews = [viewLanding, viewLobby, viewPicking, viewSubmitted, viewJudgingWaiting, viewJudgingActive, viewPostJudging, viewNextRound, viewGameOver];

// -- State --
let selectedCard = null;
let discardCards = new Set();
let menuOpen = false;
let subIndex = 0;
let resIndex = 0;
let nrIndex = 0;
let confirmAction = null;
let isReady = false;
let lastSubmissions = [];

// -- Helpers --

function showView(id) {
  allViews.forEach((v) => v.classList.add("hidden"));
  id.classList.remove("hidden");
}

function formatPrompt(prompt) {
  if (!prompt) return "";
  const parts = prompt.text;
  if (parts.length === 1) return parts[0];
  return parts.join(" _____ ");
}

function showConfirm(message, action) {
  confirmMessage.textContent = message;
  confirmAction = action;
  confirmOverlay.classList.remove("hidden");
}

function hideConfirm() {
  confirmOverlay.classList.add("hidden");
  confirmAction = null;
}

function generatePlayerId() {
  return "p" + Math.random().toString(36).substring(2, 8);
}

// -- Render --

function render(view) {
  // Top bar
  if (view.state === "landing") {
    topBar.classList.add("hidden");
  } else {
    topBar.classList.remove("hidden");
    lobbyCodeBtn.textContent = view.lobbyCode || "";
    if (view.isHost) {
      lobbyCodeBtn.classList.add("host-menu-btn");
    } else {
      lobbyCodeBtn.classList.remove("host-menu-btn");
    }

    // Host menu visibility
    menuStartNext.classList.toggle("hidden", view.state === "lobby");

    // Player icons
    playerIcons.innerHTML = "";
    view.players.forEach((p) => {
      const icon = document.createElement("div");
      icon.className = "player-icon" + (p.ready ? " ready" : "") + (p.isHost ? " host" : "");
      icon.textContent = p.score > 0 ? `${p.name} | ${p.score}` : p.name;
      icon.title = `${p.name}: ${p.score || 0} pts`;
      playerIcons.appendChild(icon);
    });
  }

  // Views
  switch (view.state) {
    case "landing":
      showView(viewLanding);
      break;

    case "lobby":
      showView(viewLobby);
      renderLobby(view);
      break;

    case "picking":
      showView(viewPicking);
      renderPicking(view);
      break;

    case "submitted":
      showView(viewSubmitted);
      break;

    case "judgingWaiting":
      showView(viewJudgingWaiting);
      judgeWaitingMsg.textContent = view.message;
      break;

    case "judgingActive":
      showView(viewJudgingActive);
      renderJudging(view);
      break;

    case "postJudging":
      showView(viewPostJudging);
      promptResult.textContent = formatPrompt(view.currentPrompt);
      resIndex = view.submissions.findIndex((s) => s.isWinner);
      if (resIndex < 0) resIndex = 0;
      renderResults(view, resultMessage, resCard, resCounter, "res");
      btnNextRound.classList.toggle("hidden", !view.isJudge);
      break;

    case "nextRoundReady":
      showView(viewNextRound);
      promptNextRound.textContent = formatPrompt(view.currentPrompt);
      nrIndex = view.submissions.findIndex((s) => s.isWinner);
      if (nrIndex < 0) nrIndex = 0;
      renderResults(view, nextRoundMsg, nrCard, nrCounter, "nr");
      break;

    case "gameOver":
      showView(viewGameOver);
      renderGameOver(view);
      break;
  }
}

function renderLobby(view) {
  lobbyPlayerList.innerHTML = "";
  view.players.forEach((p) => {
    const row = document.createElement("div");
    row.className = "lobby-player";
    row.innerHTML = `
      <span class="name">${p.name}${p.isHost ? " (host)" : ""}</span>
      <span class="status ${p.ready ? "ready" : ""}">${p.ready ? "Ready" : "Not ready"}</span>
    `;
    lobbyPlayerList.appendChild(row);
  });

  btnReady.textContent = isReady ? "Ready!" : "Ready";
  btnReady.disabled = isReady;

  if (view.isHost) {
    const allReady = view.players.length > 0 && view.players.every((p) => p.ready);
    btnStartGame.classList.toggle("hidden", !allReady);
  } else {
    btnStartGame.classList.add("hidden");
  }
}

function renderPicking(view) {
  promptDisplay.textContent = formatPrompt(view.currentPrompt);

  if (view.isJudge) {
    handDisplay.innerHTML = "<p style='color:#888; text-align:center;'>You are the judge this round. Wait for submissions.</p>";
    btnSubmitAnswer.classList.add("hidden");
    discardInfo.textContent = "";
    return;
  }

  btnSubmitAnswer.classList.remove("hidden");
  handDisplay.innerHTML = "";
  view.hand.forEach((card) => {
    const el = document.createElement("div");
    el.className = "hand-card";
    if (selectedCard === card.id) el.classList.add("selected");
    if (discardCards.has(card.id)) el.classList.add("discard");
    el.textContent = card.text;
    el.dataset.cardId = card.id;

    el.addEventListener("click", () => {
      if (discardCards.has(card.id)) {
        discardCards.delete(card.id);
      } else if (selectedCard === card.id) {
        selectedCard = null;
      } else if (selectedCard === null) {
        selectedCard = card.id;
      } else {
        discardCards.add(card.id);
      }
      renderPicking(view);
    });

    handDisplay.appendChild(el);
  });

  discardInfo.textContent = discardCards.size > 0 ? `Discarding ${discardCards.size} card(s)` : "Tap a card to select. Tap another to flag for discard.";
  btnSubmitAnswer.disabled = selectedCard === null;
}

function renderJudging(view) {
  promptJudging.textContent = formatPrompt(view.currentPrompt);
  const subs = view.submissions;
  lastSubmissions = subs;
  if (subs.length === 0) return;
  subIndex = Math.min(subIndex, subs.length - 1);
  subCard.textContent = subs[subIndex].card;
  subCounter.textContent = `${subIndex + 1} / ${subs.length}`;
}

function renderResults(view, msgEl, cardEl, counterEl, prefix) {
  msgEl.textContent = view.message;
  const subs = view.submissions;
  lastSubmissions = subs;
  if (subs.length === 0) return;
  const idx = prefix === "res" ? resIndex : nrIndex;
  const clamped = Math.min(idx, subs.length - 1);
  const sub = subs[clamped];
  cardEl.textContent = sub.card;
  cardEl.classList.toggle("winner", !!sub.isWinner);
  cardEl.classList.toggle("loser", !sub.isWinner);
  counterEl.textContent = `${clamped + 1} / ${subs.length}`;
}

function renderGameOver(view) {
  gameOverMsg.textContent = view.message;
  finalScores.innerHTML = "";
  const sorted = [...view.players].sort((a, b) => b.score - a.score);
  sorted.forEach((p) => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `<span class="name">${p.name}</span><span class="score">${p.score}</span>`;
    finalScores.appendChild(row);
  });
}

// -- Event handlers --

btnCreate.addEventListener("click", async () => {
  const name = inputName.value.trim();
  if (!name) { landingError.textContent = "Enter your name"; return; }
  landingError.textContent = "";
  btnCreate.disabled = true;

  const code = Math.random().toString(36).substring(2, 6);
  const result = await bridge.createLobby(name, code);
  if (result.error) {
    landingError.textContent = result.error;
    btnCreate.disabled = false;
  }
});

btnJoin.addEventListener("click", async () => {
  const name = inputName.value.trim();
  const code = inputCode.value.trim().toLowerCase();
  if (!name) { landingError.textContent = "Enter your name"; return; }
  if (!code) { landingError.textContent = "Enter a lobby code"; return; }
  landingError.textContent = "";
  btnJoin.disabled = true;

  const id = generatePlayerId();
  const result = await bridge.joinLobby(code, id, name);
  if (result.error) {
    landingError.textContent = result.error;
    btnJoin.disabled = false;
  }
});

btnReady.addEventListener("click", () => {
  isReady = true;
  bridge.readyUp();
  btnReady.textContent = "Ready!";
  btnReady.disabled = true;
});

btnStartGame.addEventListener("click", async () => {
  btnStartGame.disabled = true;
  const deckResp = await fetch("https://raw.githubusercontent.com/RandyHaylor/cards-against-what/master/project/data/decks/golden-girls-cards.json");
  const deck = await deckResp.json();
  const schemaResp = await fetch("https://raw.githubusercontent.com/RandyHaylor/cards-against-what/master/project/data/game-settings-schema.json");
  const schema = await schemaResp.json();
  bridge.startGame(deck, {}, schema);
});

btnSubmitAnswer.addEventListener("click", () => {
  if (!selectedCard) return;
  bridge.submitAnswer(selectedCard, [...discardCards]);
  selectedCard = null;
  discardCards.clear();
});

// Submission nav (judge)
subPrev.addEventListener("click", () => { if (subIndex > 0) { subIndex--; renderJudging(bridge.getView()); } });
subNext.addEventListener("click", () => { if (subIndex < lastSubmissions.length - 1) { subIndex++; renderJudging(bridge.getView()); } });
btnPickWinner.addEventListener("click", () => {
  if (lastSubmissions.length === 0) return;
  bridge.pickWinner(lastSubmissions[subIndex].playerId);
  subIndex = 0;
});

// Results nav
resPrev.addEventListener("click", () => { if (resIndex > 0) { resIndex--; renderResults(bridge.getView(), resultMessage, resCard, resCounter, "res"); } });
resNext.addEventListener("click", () => { if (resIndex < lastSubmissions.length - 1) { resIndex++; renderResults(bridge.getView(), resultMessage, resCard, resCounter, "res"); } });

// Next round button (post judging)
btnNextRound.addEventListener("click", () => {
  bridge.startNextRound();
});

// Next round nav
nrPrev.addEventListener("click", () => { if (nrIndex > 0) { nrIndex--; renderResults(bridge.getView(), nextRoundMsg, nrCard, nrCounter, "nr"); } });
nrNext.addEventListener("click", () => { if (nrIndex < lastSubmissions.length - 1) { nrIndex++; renderResults(bridge.getView(), nextRoundMsg, nrCard, nrCounter, "nr"); } });
btnJoinRound.addEventListener("click", () => {
  isReady = false;
  selectedCard = null;
  discardCards.clear();
  resIndex = 0;
  nrIndex = 0;
  bridge.joinNextRound();
});

// Host menu
lobbyCodeBtn.addEventListener("click", () => {
  if (!bridge.isPlayerHost()) return;
  menuOpen = !menuOpen;
  hostMenu.classList.toggle("hidden", !menuOpen);
});

document.addEventListener("click", (e) => {
  if (menuOpen && !hostMenu.contains(e.target) && e.target !== lobbyCodeBtn) {
    menuOpen = false;
    hostMenu.classList.add("hidden");
  }
});

menuStartNext.addEventListener("click", () => {
  menuOpen = false;
  hostMenu.classList.add("hidden");
  bridge.startNextRound();
});

menuEndGame.addEventListener("click", () => {
  menuOpen = false;
  hostMenu.classList.add("hidden");
  showConfirm("End the game for everyone?", () => {
    bridge.stop();
    location.reload();
  });
});

menuPlayerAdmin.addEventListener("click", () => {
  menuOpen = false;
  hostMenu.classList.add("hidden");
  const view = bridge.getView();
  adminPlayerList.innerHTML = "";
  view.players.forEach((p) => {
    const row = document.createElement("div");
    row.className = "admin-player-row";
    const url = location.origin + location.pathname + "?code=" + view.lobbyCode;
    row.innerHTML = `
      <span>${p.name}${p.isHost ? " (host)" : ""}</span>
      <div>
        <button onclick="navigator.clipboard.writeText('${url}')">Copy Rejoin Link</button>
      </div>
    `;
    adminPlayerList.appendChild(row);
  });
  playerAdminOverlay.classList.remove("hidden");
});

adminClose.addEventListener("click", () => {
  playerAdminOverlay.classList.add("hidden");
});

copyCodeBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(bridge.getLobbyCode() || "");
});

copyLinkBtn.addEventListener("click", () => {
  const url = location.origin + location.pathname + "?code=" + bridge.getLobbyCode();
  navigator.clipboard.writeText(url);
});

// Confirm dialog
confirmYes.addEventListener("click", () => { if (confirmAction) confirmAction(); hideConfirm(); });
confirmNo.addEventListener("click", hideConfirm);

// -- Bridge subscription --
bridge.onViewChange(render);

// -- URL params (auto-fill code) --
const params = new URLSearchParams(location.search);
if (params.get("code")) {
  inputCode.value = params.get("code");
}
