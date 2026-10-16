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
- Backend serves the built frontend from `frontend/dist`, so deployment is one container + FalkorDB.
