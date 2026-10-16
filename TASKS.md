# Hearsay — Tasks

Each task = one issue, from `HEARSAY_PRD.md`. A task is **done only when its checks pass**. Status: `[ ]` todo · `[~]` in progress · `[x]` done.

## Where we are (updated 2026-10-17)

**Done:** H00–H12, H15, H16. Backend, frontend build, measurements and README are done. 14 tests pass (`python -m pytest backend/tests`). `docker compose up --build` verified from the repo: it seeds, serves the UI on :8000 and the API answers.
**Game (H19):** done. Canvas 2D village, 7-step quest, Why? comic strip, achievements, win screen; the full story was played end to end in headless Chrome (Playwright, script in the session scratchpad) with zero console errors. Screenshots in `docs/screenshots/`.
**AI:** the key is in `.env` (gitignored; moved out of `.env.example`). AI Studio Gemma 4 is slow and flaky (see DECISIONS), so local play uses Ollama `gemma3:4b`. Real-model grounding: 0/50 invented names.
**3D (H20):** done. Third-person Three.js village with a 2D toggle; tested headless with zero errors.
**Docs + video (H21):** done. `docs/HOW_TO_PLAY.md`, `docs/READING_THE_GRAPH.md`, `docs/ARCHITECTURE.md`; narrated walkthrough at `media/hearsay-walkthrough.mp4` (3:18, gitignored; upload it to YouTube/Loom).
**Next up:** you play it and give feedback → deploy (H17; hosted AI = AI Studio Gemma 4 with template fallback) → video/blog (H18).
**Waiting on the user:**
- A public GitHub repo (H16 links), plus FalkorDB Cloud + Render accounts for H17.
- README "AI assistance disclosure": add which parts you wrote or reviewed yourself. Check the LICENSE name ("Yash Gurav").
**Decisions made:** see `DECISIONS.md` (the FalkorDB quirks found in H00 are listed there).

**Run locally:** `docker run -d --name falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest` → `cd backend && uvicorn app.main:app --reload` (seeds the template on first start) → `cd frontend && npm run dev`. Demo: `python scripts/demo_scenario.py`.

## Wave 0 — Foundation

- [x] **H00 Verify FalkorDB** — Docker image/ports, Cypher features (zero-length paths, pattern predicates, shortestPath, MERGE ON CREATE, CASE), index syntax, algorithm procedure names (PageRank, CDLP, betweenness), GRAPH.COPY. Fix Section 9 queries. (PRD §22, Step 1)
  Checks: every query in `backend/queries/` runs against a live FalkorDB. ✔ (quirks → DECISIONS.md)
- [x] **H01 Repo skeleton** — Section 14 layout, `requirements.txt`, `docker-compose.yml`, `Dockerfile`, `DECISIONS.md`, MIT `LICENSE`, `.gitignore`, git init.
- [x] **H02 `db.py` + query files** — FalkorDB client, one graph per player (`hearsay_<id>`), loads `queries/*.cypher` by name, times every query into `debug.queries`. Deps: H00, H01.
- [x] **H03 Seed** — `seed/village.json` (places, villagers, schedules, trust, rules, ladders from §4), `seed.py` using Q-SEED into `hearsay_template`. Deps: H02.
  Checks: template graph has 6 places, 6 villagers, 20 trust edges, 9 rules. ✔

## Wave 1 — Engine (no AI)

- [x] **H04 Gossip engine** — `engine/gossip.py` §7: tick, Q-MOVE, Q-PAIRS, Q-CANDIDATES, Q-HOP/Q-CORROBORATE, seeded RNG, ladder text. Deps: H03.
- [x] **H05 Demo scenario** — `scripts/demo_scenario.py`: steal at market tick 11, advance to 22, print hops. Deps: H04.
  Checks: theft travels Tomas → Bertha → Ilsa with growing severity. ✔ (seed 7: Tomas → Pip → Bertha, Tomas corroborates Bertha, Bertha → Ilsa at sev 4; gate blocks)
- [x] **H06 Memory** — `engine/memory.py`: Q-WITNESS, Q-OPINION (+ sceptic via sources), Q-FEELS, Q-DECAY, procedural rules §4.6. Deps: H04.
- [x] **H07 Why** — Q-WHY + holder resolution, notice-sourced beliefs. Deps: H06.
- [x] **H08 Tests §15.1** — witness, nobody_watching, hop, corroboration, echo_guard, sceptic, why_path, isolation, determinism, decay, fallback, plus notice handoff and bad input. Deps: H06, H07.

## Wave 2 — Agents + API

- [x] **H09 `llm.py`** — OpenAI-compatible client from env, cache, template fallback, `LLM_DISABLED`. Deps: H01.
- [x] **H10 Villager agent** — perceive → decide (code) → speak (AI) → remember; Q-HISTORY, Q-REMEMBER-TALK, Q-RULES. Deps: H06, H09.
- [x] **H11 API** — FastAPI routes §12 (session, state, act, talk, why, wait, graph, reset, health, queries) with `debug.queries`. Deps: H10.
  Checks: Ilsa blocks the gate after the theft spreads and explains the source; works with `LLM_DISABLED=true`. ✔ (`test_api.py`)
- [x] **H12 Spymaster** — Q-PAGERANK, Q-COMMUNITIES, Q-BROKER, Q-ROUTE, Q-WARN + `/api/spymaster/*`. Deps: H02.
  Checks: Bertha near the top of PageRank; Pip → Ilsa route correct. ✔ (Bertha #1; Pip → Bertha → Ilsa; cliques = inn crowd + Mira/Anselm)

## Wave 3 — Frontend

- [x] **H13 Frontend** (superseded by H19) — Vite + React + TS: village map, action bar, dialogue + Why?, gossip graph (react-force-graph-2d) animating hops, spymaster panel, under-the-hood drawer, welcome-back banner. Deps: H11, H12.
  Checks: full wow moment playable in the browser.

## Wave 4 — Persistence, proof, ship

- [x] **H14 Sessions + shared state** — per-player graph copy ✔, catch-up ticks ✔, welcome-back summary ✔ (API), guard notice ✔ (Q-NOTICE-POST/READ), nightly impressions ✔ (Q-IMPRESSION). Remaining: banner in the UI, two-browser check. Deps: H11.
  Checks: reopen → village remembers; a second player gets a clean village.
- [x] **H15 Measurements** — `test_no_invented_knowledge`, `scripts/load_test.py` (10/100 worlds), latency p50/p95 → `docs/results.md`. Deps: H11.
  ✔ 500 worlds alive, read p95 2.3 ms; spread stats over 50 seeds; grounding 0/50 (templates) and 0/50 (real model, gemma3:4b). Found and fixed: concurrent `GRAPH.COPY` fails with "could not fork".
- [x] **H16 README** — setup, graph model, query catalogue, architecture, measurements, tracks, AI disclosure, synthetic-data statement. Deps: all.
- [~] **H17 Deploy** — local `docker compose up --build` ✔ verified. Cloud: FalkorDB Cloud + one container (the backend serves the frontend) on Render. **Needs user accounts.**
- [ ] **H18 Video + blog + submit** — user-owned (§17–19).

## Wave 5 — Make it a game (user feedback 2026-10-17: "I didn't understand how to play")

- [x] **H19 Gamify** — intro screen, walkable canvas village (WASD/arrows/click), villagers that walk/sleep/gossip in speech bubbles, quest card (7 steps), mood faces per villager, context action bar with number keys, Space to wait, skip to evening/night/morning, dialogue with quick replies, gifts and whispers, Why? comic strip, Spyglass drawer (graph, spymaster, inspector), toasts, 7 achievements, win screen with stats. Backend: coins, gift cost, bribe rule.
  Checks: full arc playable start → win in Chrome with no errors ✔; phone width with no sideways scroll ✔; 15 tests ✔.
- [x] **H20 3D third-person** — Three.js village from primitives (buildings, stalls, well, gate towers, trees, cottages), characters with role props (hat, helmet + spear, hammer, apron, robe, cap, backpack), leg-swing walk, mood rings, day/dusk/night sky + glowing windows, DOM-overlay name tags/bubbles/prompts, third-person camera (WASD relative to camera, drag to orbit, scroll zoom, click to walk), solid buildings that fade when blocking the camera, 2D toggle + WebGL fallback.
  Checks: 3D playtest (walk, steal, evening gossip, orbit) with no errors ✔; 2D full arc still wins ✔; 15 tests ✔.
- [x] **H21 Docs + walkthrough video** — player guide, a guide to every graph/panel in the UI (with demo numbers), architecture doc (overview, data model, request flows, tick, agent loop, AI usage, concurrency, API, deployment, use in other games, glossary). Video: full story played in 3D with GPU Chrome (Playwright), Windows TTS narration (17 lines) + burned-in captions, aligned to caption changes detected in the frames, muxed with ffmpeg.
  Checks: video plays 3:18 with audio (mean −21 dB) ✔; docs match the code and the demo numbers ✔.
