import { doc, setDoc, getDoc, getDocs, collection, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

function generateLobbyCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildPlayerState(name, playerNames) {
  return {
    name: name,
    phase: "lobby",
    playerNames: playerNames,
    hand: [],
    currentPrompt: null,
    isJudge: false,
    scores: {},
    submissions: null,
    message: ""
  };
}

async function getPlayerNames(db, code) {
  const snap = await getDocs(collection(db, "lobbies", code, "players"));
  const names = [];
  snap.forEach(d => names.push(d.data().name));
  return names;
}

async function updateAllPlayerNames(db, code, playerNames) {
  const snap = await getDocs(collection(db, "lobbies", code, "players"));
  const batch = writeBatch(db);
  snap.forEach(d => {
    batch.update(d.ref, { playerNames: playerNames });
  });
  await batch.commit();
}

export async function createLobby(db, player, deckId) {
  const code = generateLobbyCode();
  await setDoc(doc(db, "lobbies", code), {
    code: code,
    deckId: deckId,
    createdBy: player.id,
    createdAt: Date.now(),
    state: "lobby"
  });
  const playerNames = [player.name];
  await setDoc(doc(db, "lobbies", code, "players", player.id), buildPlayerState(player.name, playerNames));
  return { code };
}

export async function joinLobby(db, code, player) {
  const lobbySnap = await getDoc(doc(db, "lobbies", code));
  if (!lobbySnap.exists()) {
    return { error: "Lobby not found" };
  }
  const playerNames = await getPlayerNames(db, code);
  playerNames.push(player.name);
  await setDoc(doc(db, "lobbies", code, "players", player.id), buildPlayerState(player.name, playerNames));
  await updateAllPlayerNames(db, code, playerNames);
  return { ok: true };
}
