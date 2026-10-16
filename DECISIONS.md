# Decisions

One line each: what, why.

## Verified against FalkorDB (falkordb/falkordb:latest, client 1.8.0, 2026-10-16)
- Zero-length var paths (`*0..6`), pattern predicates in `WHERE` (incl. var-length), `MERGE … ON CREATE SET`, `CASE`, string `+`, `GRAPH.COPY`: all work as the PRD wrote them.
- `shortestPath()` only works inside `WITH`/`RETURN`, not `MATCH p = shortestPath(...)`. Q-ROUTE uses `WITH`. Node order can come back target-first, so `spymaster.route` normalises it.
- `algo.pageRank('Villager', 'TRUSTS')` takes two positional args, not a config map. `algo.labelPropagation`, `algo.betweenness`, `algo.WCC` take `{nodeLabels, relationshipTypes}`.
- An `OPTIONAL MATCH` var-length path to a null-bound node expands to every path (rows multiply, path still reads null). Q-CANDIDATES puts the echo/already guards in `WHERE` pattern predicates instead.
- `ORDER BY length(path)` after `RETURN` fails when `path` isn't projected; Q-WHY orders in a `WITH` first.

## Game and model
- Rumour sentiment = event sentiment × min(1, severity / 3), not × severity / 5: with the PRD formula a severity-2 rumour two hops away could never cross the guard's −0.3 threshold.
- Trust graph is sparse (20 edges, not all 30 pairs): PageRank is unweighted in FalkorDB, so a complete graph gives everyone the same score. Ilsa only trusts Bertha and Anselm, so news reaches the guard through the innkeeper.
- Communities run WCC over a derived `CLOSE` edge (trust ≥ 0.6, made at seed time): label propagation over all `TRUSTS` gives one blob, and over `CLOSE` it oscillates on the Mira ↔ Anselm pair.
- One version per villager per event (`Rumour.id = event:villager`). A second teller corroborates (extra `HEARD_FROM`, combined confidence); the first version's wording sticks.
- Sceptic "2 independent sources" = 2+ distinct villager tellers (Q-OPINION `sources`), or seeing it first-hand. Simpler than proving disjoint chains to different witnesses.
- Procedural rules drive behaviour: the code reads `Rule` nodes (`opinion_below`, `opinion_above`, `always`) and acts on them; sceptic/priest behaviour comes from rules, not a `sceptic` property.
- Talk and Why don't advance time (villagers would walk off mid-conversation); every other action is one tick.
- The gate rule applies whenever the player tries the gate, even when Ilsa is off at the inn (a night watch stands in).
- Whisper: the player holds the hop-0 source version, so Why says "you started that story yourself", and the listener believes it with confidence 0.5.
- Returning player: catch-up is at least 6 ticks and lands on the next waking hour (7:00–22:00), so session 2 is "next day" with people about.
- Randomness: `Random(f"{seed}:{tick}")` per tick, pairs shuffled from a sorted list, so spread is reproducible across processes and restarts.
- Player id: random 12-hex id in localStorage, sent as `X-Player`; validated `^[a-z0-9]{6,32}$` because it becomes a graph name.
- One process lock per world around each request: a tick is many writes, and two tabs must not interleave them.

## Stack
- AI: one OpenAI-compatible client via httpx (`LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL`), default Gemma on Google AI Studio. Every call has a template fallback; failures aren't cached.
- AI Studio no longer serves Gemma 3 (404); this key has `gemma-4-26b-a4b-it` and `gemma-4-31b-it`. Gemma 4 always emits a `<thought>` block first (can't be disabled), so `llm.py` strips it, adds a 2048-token thinking budget, and treats "thought but no answer" as a failure.
- Measured on AI Studio (2026-10-16): 26B-A4B took 14–34 s per call and about half the calls failed (HTTP 500 or timeout); 31B took ~78 s. Too slow for live replies, so local play uses Ollama `gemma3:4b` (~1–4 s, grounded). `gemma3:1b` invented a "Sheriff", so it's out.
- Retellings and nightly impressions are written with template text inside the tick; a background thread swaps in the AI wording afterwards (`gossip.polish_later`, Q-POLISH). Ticks stay fast and deterministic; only the wording changes.
- `.env` is loaded by `backend/app/__init__.py` (stdlib, never overrides real env vars). Compose uses separate `DOCKER_LLM_*` variables so a local `localhost` Ollama URL doesn't leak into the container.
- Game layer (2026-10-17): a canvas 2D village (no engine, no asset downloads: shapes + emoji) and a 7-step quest that teaches steal → spread → blocked → Why? → repair → escape. Quest progress lives in the browser (localStorage, per player); the world itself stays in the graph.
- Coins: you start with 5 and apples cost 10, so stealing has a motive. Gifts cost 2; helping earns a 2-coin tip when someone sees it. Ilsa has a `refuse_gift` Rule (opinion below 0): a gift to a suspicious guard is a bribe and lowers her feeling, so the repair puzzle has to be solved through gossip.
- "Why?" never calls the AI: the template states the traced chain exactly and instantly. Nightly impressions are template-only too: on a local model, six AI calls every midnight queued ahead of live replies (a "Why?" took 60+ s).
- Background AI rewording runs on one worker queue (one call at a time), so a live reply waits behind at most one background call.
- Chrome's `scrollIntoView()` now returns a Promise; an arrow-body `useEffect` returned it and React crashed treating it as a cleanup. Effects always use block bodies.
- Skip buttons stop at 17:00 (evening), 22:00 (night) and 07:00 (morning): the guard only visits the inn 20–22, so skipping to 17:00 alone left new players stuck.
- 3D (2026-10-17): Three.js r169, third-person camera. Everything is primitives in code (no models, no textures except canvas-drawn signs), so it's free and has no licences. It implements the same props as the 2D canvas, so the game logic is shared and 2D is a toggle and the no-WebGL fallback. Names, bubbles and prompts are a DOM overlay projected from 3D (crisp text, cheap). Buildings are solid (circle push-out) and fade when they block the camera. Frame time is capped at 0.1 s so walking speed stays right down to 10 fps.
- FalkorDB's default query TIMEOUT is 1 s; under CPU contention Q-OPINION hit it and a request 500'd. Queries now pass `timeout=10000`, and `state()` reads every villager's rules in one query (13 → 7 queries).
- Backend serves the built frontend from `frontend/dist`, so deployment is one container + FalkorDB.
