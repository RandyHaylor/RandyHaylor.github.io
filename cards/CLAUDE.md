## Last command
host doesn't show joining players at all, but joining client does
both players raedy, non-host sees update for host being ready. nothing shows for host, just waiting for players... then Ready!

Host menu:
Start Next Round should probably not show if in lobby
Player admin just shows an empty panel with title Player Admin then Close button (one non host player joined and shoing ready in lobby.
Host not showing a start game option (but to be fair it's not seeming to get any updates for players being ready).

I'm guessing that there are fundamental flaws in the abstraction for player updates syncing.

allows duplicate name players to join (join button should look at player names and not allow join with same name)


# Cards Against What

Cards Against Humanity clone for mobile web on top of Firebase.
Firestore DB. Host game logic runs on player one's client. All player client logic in JS on static Firebase-hosted sites. Free Spark plan — no Cloud Functions, no billing.
No npm. No frameworks. No builds. Firebase CLI for deployment. Firebase SDK and XState loaded via CDN everywhere — dev and production identical.

## Architecture

- Host and client are each driven by an XState state machine (see `data/server-state-flow.json` and `data/client-state-flow.json`)
- Each state has enter/during/exit logic in its own module
- Action logic lives in `server/actions.js` and `player/actions.js`, not inline in machine.js. Actions are passthrough functions to the sync controller, reusable across states.
- Host logic runs on player one's browser. Host code ships in every client but only activates for the player flagged as host.
- Server holds ALL game state in memory (XState context) — not in Firestore. This includes an array of all player objects, including player one.
- Each player object contains a `players` array: `[{ name, score, ready, isHost }]`. This is the single source of truth for who's playing, scores, and readiness. `ready` is used in lobby (ready to start) and during gameplay (submitted answer).
- Player-writable fields live in a `clientUpdates` container: `{ playerReady, submission, discardRequests }`. Clear boundary — server writes everything else, players only write inside `clientUpdates`.
- `playerSyncController.js` owns all sync between client and server. It hides whether updates go via Firestore (non-host) or directly to the server actor (host). Neither the server machine nor client/player code imports Firebase — only the sync controller does.
- Firestore is a sync layer, not a state store. Server serializes player objects directly to player docs for players 2+. Player one doesn't need a Firestore doc — they ARE the server.
- Server creates a minimal lobby doc as a signpost for joining players. Joining players check it exists, then write their own doc. Server watches the players collection for new joins.
- Players only listen (onSnapshot) to their own doc — never the lobby doc, never other players' docs.
- Server clears player submission/discard fields when writing the next round's state. Each round starts clean.
- Deck loaded from cardsUrl (GitHub raw), not stored in Firestore.
- If host disconnects, game ends. Acceptable — players are physically together.

## Testing

- Tests are HTML files containing JS that run against live Firestore — no mocks, no emulators
- Puppeteer (installed globally) runs them headless from the terminal via `node project/test/run.js` (or pass a different test file as argument)
- Tests tell a multiplayer story: create lobby, join, play rounds, score, win
- Same CDN-loaded Firebase SDK as production — no environment differences

## Commandments

0. **Client app layer exists and is separate from GUI.** Game logic lives in plain JS modules with zero DOM awareness. Testable without any GUI. The GUI is a dumb skin. GUI knows nothing about Firestore or game rules.

1. **No reactive waterfalls.** Firestore subscriptions feed the client app layer, not UI components. No listener → component → cascade → logic-in-render-tree chains.

2. **All features work without a front end.** JS modules are written and tested BEFORE any HTML exists.

3. **Two state objects, never merged.** `playerGameState` (from Firestore) and `guiState` (for rendering) are fully separate. The app layer translates between them with well-named functions.

4. **Respect Firebase usage.** No live-updating on keystrokes or field changes. DB reads/writes happen on submit actions or proper hooks only.

5. **Git commits: single line message, no attribution. Never compound git commands — no `cd && git`, no `git add && git commit`. Each git command runs as its own separate call.**

6. **Name functions after what they do in plain English.** If the design doc says "replaces discard-requested and submitted cards in player's hand," the function reads close to that.

7. **Dev cycle: write code → test → update CLAUDE.md/DESIGN.md when relevant → commit → push.** Follow this loop. Don't skip steps.

8. **Be methodical and take notes while troubleshooting.** Use troubleshooting-notes.md to save breadcrumbs — what you've found, what you still need, what you're doing next. Do not endlessly trace files in silence. Apply these techniques:
   - **Divide and conquer.** Comment out half, test. Comment out half of that, test. Binary search to the problem.
   - **Step back before zooming in.** Check higher-level possibilities first: wrong path, wrong server, wrong environment, missing dependency. The bug might not be in the code at all.
   - **Restore from history, not memory.** Check chat history first, then git history. Don't rewrite files from scratch.
   - **Stop after depth 6.** If you've traced 6 files, searches, or lookups without a clear answer, stop and reassess your approach.
