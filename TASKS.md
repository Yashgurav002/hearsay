# Hearsay — Tasks

Each task = one issue, from `HEARSAY_PRD.md`. A task is **done only when its checks pass**. Status: `[ ]` todo · `[~]` in progress · `[x]` done.

## Where we are (updated 2026-10-16, late night)

**Done:** H00–H12, H15, H16. Backend, frontend build, measurements and README are done. 14 tests pass (`python -m pytest backend/tests`). `docker compose up --build` verified from the repo: it seeds, serves the UI on :8000 and the API answers.
**In progress:** H13/H14: the UI builds and the API flow is verified over HTTP, but it hasn't been played in a browser yet (the Chrome extension wasn't connected).
**Next up:** play the wow moment in the browser and fix UI issues → measure grounding with the real model → deploy (H17) → video/blog (H18).
**Waiting on the user:**
- An `LLM_API_KEY` (Google AI Studio) to turn on AI voices; templates are used until then. Then run `python scripts/grounding_check.py 50` for the real-model grounding number.
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

- [~] **H13 Frontend** (built; browser playtest pending) — Vite + React + TS: village map, action bar, dialogue + Why?, gossip graph (react-force-graph-2d) animating hops, spymaster panel, under-the-hood drawer, welcome-back banner. Deps: H11, H12.
  Checks: full wow moment playable in the browser.

## Wave 4 — Persistence, proof, ship

- [~] **H14 Sessions + shared state** — per-player graph copy ✔, catch-up ticks ✔, welcome-back summary ✔ (API), guard notice ✔ (Q-NOTICE-POST/READ), nightly impressions ✔ (Q-IMPRESSION). Remaining: banner in the UI, two-browser check. Deps: H11.
  Checks: reopen → village remembers; a second player gets a clean village.
- [x] **H15 Measurements** — `test_no_invented_knowledge`, `scripts/load_test.py` (10/100 worlds), latency p50/p95 → `docs/results.md`. Deps: H11.
  ✔ 500 worlds alive, read p95 2.3 ms; spread stats over 50 seeds; grounding 0/50 (templates). Found and fixed: concurrent `GRAPH.COPY` fails with "could not fork".
- [x] **H16 README** — setup, graph model, query catalogue, architecture, measurements, tracks, AI disclosure, synthetic-data statement. Deps: all.
- [~] **H17 Deploy** — local `docker compose up --build` ✔ verified. Cloud: FalkorDB Cloud + one container (the backend serves the frontend) on Render. **Needs user accounts.**
- [ ] **H18 Video + blog + submit** — user-owned (§17–19).
