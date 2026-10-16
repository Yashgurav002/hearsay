# Measured results

All numbers measured on 2026-10-16 on a Windows 11 laptop, FalkorDB `falkordb/falkordb:latest` in Docker Desktop, Python 3.11, AI off (templates), so these are graph-only timings.

## Many worlds in one FalkorDB instance
`python scripts/load_test.py 10 100 500`. Each world is a separate graph (`GRAPH.COPY` of the template), plays the theft and 10 gossip ticks, then reads Q-BELIEFS + Q-OPINION for all 6 villagers. 16 worlds run in parallel; every world stays alive until the run ends.

| worlds (all alive at end) | wall time (s) | Q-BELIEFS/Q-OPINION p50 (ms) | p95 (ms) | full tick p50 (ms) | p95 (ms) |
|---|---|---|---|---|---|
| 10 (10) | 1.3 | 1.04 | 1.95 | 15.2 | 20.0 |
| 100 (100) | 10.4 | 1.02 | 1.70 | 15.1 | 17.4 |
| 500 (500) | 51.4 | 1.09 | 2.26 | 16.9 | 28.9 |

Read latency stays flat from 10 to 500 worlds. A full tick (move, pairs, candidates, hops, rules) is about 20 queries.

Found while load testing: `GRAPH.COPY` forks the server, and concurrent copies fail with `could not fork`. `World.create` now serialises copies and retries.

## Per-request latency (single world, live server)
| Request | Total | Graph queries |
|---|---|---|
| `GET /api/why` | 7.7 ms | Q-WHY 2.4 ms, Q-WHY holders 2.2 ms |
| `POST /api/act` steal | 28.9 ms | witness + one full tick |
| `POST /api/wait` 10 ticks | 134.9 ms | ≈ 13 ms per tick |

With the AI on, a villager reply is dominated by the model call; the inspector shows graph ms vs AI ms for every reply.

## Spread stats (50 seeds)
Theft at the market at 11:00 (only Old Tomas sees it), then up to 48 hours of gossip.
- The guard heard about it in **50 / 50** runs. Median: **9 hours** (the first evening at the inn); slowest: 33 hours.
- Severity on arrival: mean **2.54** (1: 2 runs, 2: 27, 3: 13, 4: 8). "Took an apple" usually reaches the guard as "stole a basket of apples" or worse.

## Grounding
`test_no_invented_knowledge` (`scripts/grounding_check.py`): 50 conversations across the village after the theft spreads. With templates: **0 / 50**. With the real model (Ollama `gemma3:4b`, 2026-10-16): **0 / 50** replies named a villager outside the speaker's graph context (236 s for 50 conversations, about 4.7 s each). Rerun with `python scripts/grounding_check.py 50`.

## AI provider latency (2026-10-16)
| Model | Where | Per call | Notes |
|---|---|---|---|
| `gemma3:4b` | local Ollama | ~1–4 s | used for local play; grounded |
| `gemma-4-26b-a4b-it` | Google AI Studio | 14–34 s | always thinks first; about half the calls failed (500 or timeout) |
| `gemma-4-31b-it` | Google AI Studio | ~78 s | too slow for replies |
