import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  collection,
  onSnapshot,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export function createSyncController(db) {
  let serverActor = null;

  return {
    setServerActor(actor) {
      serverActor = actor;
    },

    createLobby(lobbyCode) {
      return setDoc(doc(db, "lobbies", lobbyCode), {
        createdAt: Date.now(),
      });
    },

    writeHostPlayerDoc(lobbyCode, name) {
      return setDoc(doc(db, "lobbies", lobbyCode, "players", "1"), { name });
    },

    async getNamesForLobby(lobbyCode) {
      const playersSnap = await getDocs(collection(db, "lobbies", lobbyCode, "players"));
      return playersSnap.docs.map((d) => d.data().name || "");
    },

    watchPlayers(lobbyCode, sendBack) {
      const unsub = onSnapshot(
        collection(db, "lobbies", lobbyCode, "players"),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              sendBack({
                type: "PLAYER_JOINED",
                playerId: change.doc.id,
                name: change.doc.data().name,
              });
            }
            if (change.type === "modified") {
              const data = change.doc.data();
              if (data.clientUpdates?.playerReady) {
                sendBack({
                  type: "PLAYER_READY",
                  playerId: change.doc.id,
                });
              }
              if (data.clientUpdates?.submission !== null && data.clientUpdates?.submission !== undefined) {
                sendBack({
                  type: "PLAYER_SUBMITTED",
                  playerId: change.doc.id,
                  submission: data.clientUpdates.submission,
                  discardRequests: data.clientUpdates.discardRequests,
                });
              }
              if (data.clientUpdates?.pickWinner) {
                sendBack({
                  type: "PICK_WINNER",
                  playerId: change.doc.id,
                  winnerId: data.clientUpdates.pickWinner,
                });
              }
              if (data.clientUpdates?.nextRound) {
                sendBack({ type: "NEXT_ROUND" });
              }
            }
          });
        }
      );
      return () => unsub();
    },

    createGameHistory(lobbyCode, playerMetadata) {
      return setDoc(doc(db, "gamehistory", lobbyCode), {
        lobbyCode,
        createdAt: Date.now(),
        players: [playerMetadata],
        rounds: [],
      });
    },

    logPlayerMetadata(lobbyCode, playerMetadata) {
      return updateDoc(doc(db, "gamehistory", lobbyCode), {
        players: arrayUnion(playerMetadata),
      });
    },

    logRound(lobbyCode, roundData) {
      return updateDoc(doc(db, "gamehistory", lobbyCode), {
        rounds: arrayUnion(roundData),
      });
    },

    deletePlayerDoc(lobbyCode, playerId) {
      return deleteDoc(doc(db, "lobbies", lobbyCode, "players", playerId));
    },

    syncPlayerDocs(lobbyCode, players) {
      const batch = writeBatch(db);
      for (const player of players) {
        if (player.isHost) continue;
        batch.set(
          doc(db, "lobbies", lobbyCode, "players", player.id),
          player
        );
      }
      return batch.commit();
    },

    async joinLobby(lobbyCode, playerId, name) {
      const lobbySnap = await getDoc(doc(db, "lobbies", lobbyCode));
      if (!lobbySnap.exists()) {
        return { error: "Lobby not found" };
      }
      const playersSnap = await getDocs(collection(db, "lobbies", lobbyCode, "players"));
      const names = playersSnap.docs.map((d) => d.data().name || "");
      if (names.some((n) => n.toLowerCase() === name.toLowerCase())) {
        return { error: "Name already taken" };
      }
      const newId = String(playersSnap.docs.length + 1);
      await setDoc(doc(db, "lobbies", lobbyCode, "players", newId), { name });
      return { ok: true, playerId: newId };
    },

    setPlayerReady(lobbyCode, playerId) {
      if (serverActor) {
        serverActor.send({ type: "PLAYER_READY", playerId });
      } else {
        updateDoc(doc(db, "lobbies", lobbyCode, "players", playerId), {
          "clientUpdates.playerReady": true,
        });
      }
    },

    submitAnswer(lobbyCode, playerId, submission, discardRequests) {
      if (serverActor) {
        serverActor.send({ type: "PLAYER_SUBMITTED", playerId, submission, discardRequests });
      } else {
        updateDoc(doc(db, "lobbies", lobbyCode, "players", playerId), {
          "clientUpdates.submission": submission,
          "clientUpdates.discardRequests": discardRequests || [],
        });
      }
    },

    pickWinner(lobbyCode, playerId, winnerId) {
      if (serverActor) {
        serverActor.send({ type: "PICK_WINNER", playerId, winnerId });
      } else {
        updateDoc(doc(db, "lobbies", lobbyCode, "players", playerId), {
          "clientUpdates.pickWinner": winnerId,
        });
      }
    },

    startNextRound(lobbyCode, playerId) {
      if (serverActor) {
        serverActor.send({ type: "NEXT_ROUND" });
      } else {
        updateDoc(doc(db, "lobbies", lobbyCode, "players", playerId), {
          "clientUpdates.nextRound": true,
        });
      }
    },

    watchMyDoc(lobbyCode, playerId, callback) {
      if (serverActor) {
        const sub = serverActor.subscribe(() => {
          const player = serverActor.getSnapshot().context.players.find((p) => p.id === playerId);
          if (player) callback(player);
        });
        return () => sub.unsubscribe();
      }
      return onSnapshot(
        doc(db, "lobbies", lobbyCode, "players", playerId),
        (snap) => {
          if (snap.exists()) {
            callback(snap.data());
          }
        }
      );
    },
  };
}
