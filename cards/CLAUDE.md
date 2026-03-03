# Cards Against What

Cards Against Humanity clone for mobile web on top of Firebase. Full project design in [DESIGN.md](../DESIGN.md).

## DESIGN.md sections
- Status & Roadmap
- Tech Stack
- Game Flow
- Architecture
- Server States
- Client States
- Firestore Structure
- Deck & Cards
- Settings
- Testing
- Content & Reference Files

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
