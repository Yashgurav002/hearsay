# Hearsay — Tasks

Each task = one issue, from `HEARSAY_PRD.md`. A task is **done only when its checks pass**. Status: `[ ]` todo · `[~]` in progress · `[x]` done.

## Where we are (updated 2026-10-16 night)

**Done:** H00–H12. The backend is complete: engine, memory, agents, spymaster and API. 13 tests pass (`python -m pytest backend/tests`).
**In progress:** H13 frontend.
**Waiting on the user:** an `LLM_API_KEY` (Google AI Studio) to turn on AI voices. Until then, templates are used.
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

- [~] **H13 Frontend** — Vite + React + TS: village map, action bar, dialogue + Why?, gossip graph (react-force-graph-2d) animating hops, spymaster panel, under-the-hood drawer, welcome-back banner. Deps: H11, H12.
  Checks: full wow moment playable in the browser.

## Wave 4 — Persistence, proof, ship

- [~] **H14 Sessions + shared state** — per-player graph copy ✔, catch-up ticks ✔, welcome-back summary ✔ (API), guard notice ✔ (Q-NOTICE-POST/READ), nightly impressions ✔ (Q-IMPRESSION). Remaining: banner in the UI, two-browser check. Deps: H11.
  Checks: reopen → village remembers; a second player gets a clean village.
- [ ] **H15 Measurements** — `test_no_invented_knowledge`, `scripts/load_test.py` (10/100 worlds), latency p50/p95 → `docs/results.md`. Deps: H11.
- [ ] **H16 README** — setup, graph model, query catalogue, architecture, measurements, tracks, AI disclosure, synthetic-data statement. Deps: all.
- [ ] **H17 Deploy** — FalkorDB Cloud + one container (backend serves the frontend) on Render, or a verified `docker compose up` from a fresh clone. **Needs user accounts.**
- [ ] **H18 Video + blog + submit** — user-owned (§17–19).
