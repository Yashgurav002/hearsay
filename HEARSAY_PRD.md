# Hearsay — PRD & Build Spec

> **NPCs that remember what you did, and gossip about it.**
> Hearsay is a small web game and an open-source memory engine where every villager's memories, beliefs and relationships live in a FalkorDB graph. When you do something, the villagers who saw it remember it. When villagers meet, rumours travel along their trust relationships and get exaggerated with every retelling. Characters who never saw you act on what they've *heard*, and when you ask "why?", they show you exactly who told whom.

**Hackathon:** Graph Hacks: Context for AI Agents (WeMakeDevs × FalkorDB)
**Window:** Oct 15, 12:01 AM IST → **Oct 18, 11:59 PM IST** (submit by ~8 PM IST Sunday to be safe)
**Today:** Friday, Oct 16. About 3 days of build time.
**Tracks entered:** **Track 02 — Agent Memory and Coordination** (primary) and **Track 01 — Agents That Act on Connected Data** (secondary). Name both when submitting.
**Optional second submission:** Hacktoberfest Open-Source AI Challenge Week 2 "Side Hustle" (due Oct 18 11:59 PM PDT = Oct 19 ~12:29 PM IST), framed as an open-source NPC memory engine indie developers would pay for. Only if both hackathons allow the same project elsewhere [verify both rule pages].

---

## 0. Read this first

### 0.1 Rules this PRD is designed around (from the Graph Hacks rules page)
| Rule | How Hearsay complies |
| --- | --- |
| FalkorDB is the primary graph DB and supports a central part of the product | All memory, beliefs, relationships, gossip propagation, explanations and per-player worlds live in FalkorDB. There is no other database. |
| The graph must do real work; remove FalkorDB and the product must stop working | Without the graph there is no memory, no gossip, no "why", no influence map. The AI model only phrases text from what the graph returns. |
| Only public, synthetic or own data | Every villager, place and event is fictional and created by us. Players are anonymous IDs. |
| Main coding starts after Oct 15, 12:01 AM IST | Coding starts Friday Oct 16. Planning before that is allowed. |
| Submission must include: public repo, README with setup **and graph data model**, the **Cypher queries / algorithms** the product depends on, demo video, live deployment or full local setup, tracks entered | Section 18 is a checklist for exactly these. The query catalogue (Section 9) goes into the README. |
| AI coding assistants allowed but must be disclosed | README has an "AI assistance disclosure" section. |
| You must understand and be able to explain the code, graph model, queries and decisions | Section 20 is a question-and-answer prep sheet; keep `DECISIONS.md` updated as you build. |

### 0.2 How to use this file for vibe coding
- Put it in the repo root. Tell your coding agent: *"Read HEARSAY_PRD.md. Build only Step N of Section 16. Stop when its checks pass."*
- **Write and read every Cypher query yourself** in FalkorDB Browser before letting code use it. This is what you'll be questioned on.
- Never let the agent invent FalkorDB procedures or syntax. If a query fails, check docs.falkordb.com/cypher and docs.falkordb.com/algorithms and fix it there. Items marked **[verify]** were written from memory without web access.
- Commit after every passing step. Note every important choice in `DECISIONS.md` (one line: what, why).

---

## 1. Summary

**Name:** Hearsay · **Tagline:** *Everyone's talking about you.*

**One-line pitch:** A memory and gossip engine for game characters, built on a graph: villagers remember what they witnessed, pass rumours along trust relationships, exaggerate them as they go, and act on what they believe, with every belief traceable to its source.

**The wow moment (demo minute 1):**
1. Session 1: you steal an apple at the market. Only the merchant sees it.
2. Time passes. The merchant tells the innkeeper at the tavern; the innkeeper tells the guard at the gate. Each retelling is a little worse: *"took an apple"* → *"stole a basket"* → *"robbed the market"*.
3. You close the tab.
4. Session 2, next day: the guard, who never saw you, blocks the gate.
5. You ask **"Why?"**. The guard says *"Bertha at the inn told me, and she heard it from old Tomas."* The screen lights up the exact path through the village graph, showing each distorted version on each hop, plus the Cypher query that found it.

**Why it can win:**
1. **Novel.** Track 2 will be full of "chatbot that remembers your name". Hearsay is memory *between* agents, with provenance, distortion and consequences.
2. **The graph does everything that matters.** Memory, sharing, trust, propagation, explanation, influence and per-player isolation are all graph structures and queries.
3. **It hits every Track 2 focus point** (Section 3.2) and several Track 1 points.
4. **Explainable by design.** Every action has a traceable path, and the UI shows the Cypher behind it.
5. **Instantly understood.** Anyone who has played a game gets it in 15 seconds; it makes a great blog post (AirPods side prize).

---

## 2. Problem and users

**Problem.** Game characters (NPCs) are mostly amnesiac. They forget what you did, never tell each other, and when games do react, it's usually a single "reputation" number. Building believable shared memory is hard, so most games skip it, even though players love worlds that remember (the Nemesis System in *Shadow of Middle-earth* is famous for exactly this).

**Underlying agent problem (what the hackathon cares about).** Agents that share a world need: memory that persists, knowledge that moves between agents only through realistic channels, a record of *where* each belief came from, and decisions you can trace. That's a graph problem.

**Users**
| User | Need | What Hearsay gives them |
| --- | --- | --- |
| Players | A world that reacts believably to what they did | Villagers who remember, gossip and change behaviour |
| Indie game developers | NPC memory without building it from scratch | An open-source engine + API: events in, beliefs and explanations out |
| Judges / developers | To see agent memory and coordination done right | A live, inspectable graph with the queries behind every decision |

---

## 3. Goals, non-goals, success criteria

### 3.1 Goals (by Sunday)
- A playable web village with 6 villagers and 6 places, where gossip spreads, distorts and changes behaviour.
- Memory that persists across sessions, with a separate world graph per player.
- A "Why?" explanation that shows the gossip path for any belief.
- An influence view using graph algorithms (most influential gossip, cliques, fastest route for a rumour).
- A live deployment, a public repo with the required README, and a demo video.

### 3.2 How Hearsay covers the track focus areas
| Track 2 focus | Hearsay feature |
| --- | --- |
| Episodic memory | `WITNESSED` events, each conversation stored as an event |
| Semantic memory | `Rumour` beliefs with confidence; nightly consolidation into an `Impression` per villager |
| Procedural memory | Behaviour rules stored as `Rule` nodes per role (e.g. guard: block if opinion < −0.3) |
| Persistent conversation history | `Conversation` events linked to villager and player, reused next session |
| Shared state and handoffs between agents | Gossip hops; the guard posts a `Notice` that other agents read |
| High-concurrency reads and writes | World ticks run villagers concurrently; a load test runs many player worlds at once |
| Separate memory per user or tenant | One FalkorDB graph per player: `hearsay_<playerId>` |

| Track 1 focus | Hearsay feature |
| --- | --- |
| Multi-hop reasoning | Variable-length `HEARD_FROM` paths back to the original event |
| Graph queries and algorithms as agent tools | Villager tools: `myBeliefsAbout`, `whyDoIBelieve`, `whoShouldIWarn`; spymaster tools: PageRank, community detection, shortest path |
| Actions based on what the graph shows | Block the gate, raise prices, refuse to talk, give a discount, offer a quest |
| Explainable results | "Why?" path, plus the Cypher shown in the inspector |
| Tool selection through MCP | Stretch: FalkorDB MCP server lets an assistant query a world |

### 3.3 Non-goals
- Not a big game. One village, short sessions, simple graphics.
- No accounts with personal data: a random anonymous player ID in a cookie.
- No other database. FalkorDB only.

### 3.4 Success criteria
- The wow moment works live, every time (deterministic seed + fallback text if the AI is rate-limited).
- Zero "made-up" knowledge: villagers never mention events they haven't witnessed or heard (tested, Section 15).
- Graph queries per villager turn: under 50 ms median on local Docker (measured).
- 100+ concurrent player worlds in one FalkorDB instance without slowdown (measured, if time allows).

---

## 4. Game design

### 4.1 Time
The world runs on **ticks**. One tick = one in-game hour. Each player action advances time by 1 tick; a **"Wait an hour"** button advances it manually. Sessions don't need real time to pass: when a player returns, the world "catches up" a fixed number of ticks (default 6), so gossip has spread.

### 4.2 Places
| id | Name | Notes |
| --- | --- | --- |
| `market` | The Market | Merchant's stall; theft happens here |
| `inn` | The Crooked Kettle (inn) | Gossip hub in the evening |
| `forge` | The Forge | Blacksmith |
| `chapel` | St. Aldric's Chapel | Priest |
| `well` | The Well | Morning meeting spot |
| `gate` | The Town Gate | Guard; blocks or lets you through |

### 4.3 Villagers (all fictional)
| id | Name | Role | Gossip (chance to share) | Exaggeration (chance to worsen a story) | Personality |
| --- | --- | --- | --- | --- | --- |
| `tomas` | Old Tomas | Merchant | 0.7 | 0.5 | Grumpy, holds grudges |
| `bertha` | Bertha | Innkeeper | 0.95 | 0.4 | Warm, knows everyone, the hub |
| `ilsa` | Captain Ilsa | Guard | 0.3 | 0.1 | Strict, acts on reports |
| `mira` | Mira | Blacksmith | 0.4 | 0.0 | Honest sceptic: needs 2 independent sources to believe |
| `pip` | Pip | Child | 1.0 | 0.8 | Tells everyone; adults trust Pip less |
| `anselm` | Father Anselm | Priest | 0.1 | 0.0 | Discreet; forgives |

**Daily schedules** (place per tick-of-day, stored as properties on each villager and applied every tick):
- Morning (6–10): Bertha, Pip, Anselm at the well; Tomas at the market; Mira at the forge; Ilsa at the gate.
- Day (10–17): Tomas market, Mira forge, Ilsa gate, Anselm chapel, Bertha inn, Pip roams (market → forge → chapel).
- Evening (17–23): Tomas, Mira, Pip at the inn; Bertha inn; Ilsa at the inn 20–21 (shift change), else gate; Anselm chapel.
- Night (23–6): everyone home (no gossip).

### 4.4 Trust (seeded, directed: "A trusts B" means A believes what B tells them)
High: Bertha ↔ Tomas (0.8), Ilsa → Bertha (0.75), Mira → Anselm (0.9), Anselm → Mira (0.7).
Medium: most others 0.4–0.6.
Low: everyone → Pip (0.25), Tomas → Mira (0.3).
Trust changes: if a villager acts on a rumour that turns out false, their trust in the teller drops by 0.2 (stretch).

### 4.5 Player actions
| Action | Effect |
| --- | --- |
| **Talk** (free text) | Villager answers using only what it knows; conversation stored as an event |
| **Buy** | Price depends on the merchant's opinion of you |
| **Steal** (market) | Creates a theft event; whoever is at the market witnesses it |
| **Help** (fetch water for the priest, fix the inn sign) | Creates a good-deed event, which spreads too |
| **Gift** | Raises one villager's direct feeling toward you |
| **Whisper** (spymaster) | Tell a villager a rumour about someone; it spreads like any other |
| **Pass the gate** | Guard decides from opinion and procedural rule |
| **Ask "Why?"** | Shows the provenance path for the villager's strongest belief about you |
| **Wait an hour** | Advance one tick |

### 4.6 Consequences (procedural rules)
| Villager | Rule |
| --- | --- |
| Ilsa (guard) | Block the gate if opinion < −0.3; if opinion < −0.6 also post a `Notice` (wanted) |
| Tomas (merchant) | Price × (1 − 0.5 × opinion), so bad reputation raises prices, good lowers them |
| Bertha (innkeeper) | Refuses a room if opinion < −0.5; tells you gossip if opinion > 0.3 |
| Mira (blacksmith) | Ignores rumours unless 2+ independent sources; otherwise neutral |
| Anselm (priest) | Never acts on gossip; forgives after a good deed |
| Pip (child) | Repeats whatever they've heard most recently, to anyone |

### 4.7 Distortion ladder (makes exaggeration deterministic and testable)
Each event kind has a severity ladder; each retelling has a chance (the teller's exaggeration) to move up one step. The AI only rephrases the current step in the teller's voice.

| Severity | Theft | Good deed |
| --- | --- | --- |
| 1 | took an apple from Tomas's stall | fetched water for Father Anselm |
| 2 | stole a basket of apples | helped at the chapel all morning |
| 3 | robbed Tomas's stall | is always helping people |
| 4 | robbed the market | saved the chapel |
| 5 | is part of a gang of thieves | is practically a saint |

### 4.8 The "spymaster" view (graph algorithms as gameplay)
A side panel the player can open:
- **Most influential gossip:** PageRank over trust relationships ("Bertha: 0.31").
- **Cliques:** community detection over strong trust ("the inn crowd", "the chapel pair").
- **Fastest rumour route:** shortest path from the villager you whisper to, to a target ("Tell Pip → Bertha → Ilsa: 2 hops").
Players use it to repair their reputation by planting a good rumour with the right person.

---
## 5. Graph data model

One FalkorDB graph **per player world**: `hearsay_<playerId>`. A read-only template graph `hearsay_template` holds the seeded village; new players get a copy (`GRAPH.COPY` if available [verify], else re-run the seed script into the new graph).

### 5.1 Nodes
| Label | Key properties | Meaning |
| --- | --- | --- |
| `Player` | `id`, `name`, `created_tick` | The human player (anonymous) |
| `Villager` | `id`, `name`, `role`, `gossip`, `exaggeration`, `sceptic` (bool), `schedule` (JSON string), `persona` (short text) | An NPC agent |
| `Place` | `id`, `name` | A location |
| `Event` | `id`, `kind` (`theft`/`good_deed`/`gift`/`conversation`/`whisper`), `tick`, `juiciness` (0–1), `sentiment` (−1..1), `base_text` | Something that actually happened (episodic) |
| `Rumour` | `id`, `text`, `severity` (1–5), `sentiment`, `hops`, `created_tick` | One villager's **version** of a story (semantic). Each retelling creates a new Rumour node for the listener |
| `Rule` | `id`, `role`, `condition`, `action`, `threshold` | Procedural memory per role |
| `Notice` | `id`, `kind` (`wanted`), `tick`, `text` | Shared state posted by one agent for others (handoff) |
| `Impression` | `text`, `updated_tick` | Nightly summary of a villager's view of the player (consolidated memory) |
| `World` | `tick`, `version` | Single node with the current clock |

### 5.2 Relationships
| Type | From → To | Properties | Meaning |
| --- | --- | --- | --- |
| `AT` | Villager/Player/Event → Place | — | Where someone is now / where an event happened |
| `TRUSTS` | Villager → Villager | `weight` (0–1) | A believes what B says, with this strength. Direction = **who listens to whom** |
| `WITNESSED` | Villager → Event | `tick` | Saw it first-hand |
| `HOLDS` | Villager → Rumour | `confidence` (0–1), `since`, `last_reinforced` | This villager believes this version |
| `HEARD_FROM` | Rumour → Rumour | `tick`, `place` | This version was told from that version (provenance chain) |
| `ORIGIN` | Rumour → Event | — | Which real event the story is ultimately about |
| `ABOUT` | Event/Rumour/Impression/Notice → Player/Villager | — | Who the story is about |
| `FEELS` | Villager → Player | `affinity` (−1..1) | Direct feeling from own experience (gifts, conversations) |
| `FOLLOWS` | Villager → Rule | — | Procedural memory: which rules this villager applies |
| `POSTED` | Villager → Notice | `tick` | Who posted shared state |
| `READ` | Villager → Notice | `tick` | Who has seen it |
| `HAS_IMPRESSION` | Villager → Impression | — | Consolidated view |
| `SPOKE_WITH` | Event(conversation) → Villager | — | Conversation history (with `ABOUT` → Player) |

### 5.3 Picture of one rumour chain
```
(:Player {id:'p1'})
      ▲ ABOUT                    ▲ ABOUT                    ▲ ABOUT
      │                          │                          │
(:Event theft, tick 11) ◀─ORIGIN─ (:Rumour sev1 "took an apple") ◀─HOLDS─ (Tomas)
      ▲                          ▲
      │ ORIGIN                   │ HEARD_FROM (tick 19, inn)
      │                  (:Rumour sev2 "stole a basket") ◀─HOLDS─ (Bertha)
      │                          ▲
      └──────ORIGIN──────────────┤ HEARD_FROM (tick 20, inn)
                         (:Rumour sev3 "robbed the stall") ◀─HOLDS─ (Ilsa)
(Tomas)-[:WITNESSED]->(:Event)      (Ilsa)-[:TRUSTS {0.75}]->(Bertha)-[:TRUSTS {0.8}]->(Tomas)
```

### 5.4 Indexes
```cypher
CREATE INDEX FOR (v:Villager) ON (v.id)
CREATE INDEX FOR (r:Rumour) ON (r.id)
CREATE INDEX FOR (e:Event) ON (e.id)
CREATE INDEX FOR (p:Player) ON (p.id)
CREATE INDEX FOR (pl:Place) ON (pl.id)
```
[verify index syntax in FalkorDB docs]

---

## 6. Memory model (the maths, kept simple)

**Witnessing.** When an event happens at a place, every villager `AT` that place gets `WITNESSED` + a severity-1 `Rumour` with `HOLDS.confidence = 1.0`.

**Retelling (one hop).** When teller A shares rumour `rA` with listener B:
- `severity_B = min(5, severity_A + 1)` with probability `A.exaggeration`, else `severity_A`.
- `confidence_B = confidence_A × trust(B→A) × 0.9` (each hop loses a little).
- `hops_B = hops_A + 1`.
- If B already holds a version of the **same origin event**: don't create a new node; add another `HEARD_FROM` from B's version to `rA` (a second source) and **combine** confidence: `c = 1 − (1 − c_old) × (1 − c_new)`. Two people telling you the same thing makes you more sure.
- Sentiment of a rumour = event sentiment × (severity / 5) for bad events, and the same for good ones (positive).

**Sceptics (Mira).** A rumour only counts for a sceptic if it has **2+ independent sources**: at least two `HEARD_FROM` chains that reach the origin through different first-hand witnesses.

**Opinion of the player** (used for decisions):
`opinion(V) = clamp( Σ over rumours V holds about the player (sentiment × confidence) + FEELS.affinity , −1, 1 )`

**Forgetting.** Each in-game midnight: `confidence × 0.97` for beliefs not reinforced in 24 ticks; below 0.1 the belief is "faded" (kept for history, ignored for decisions).

**Consolidation (nightly).** For each villager with new memories about the player, the AI writes a one-sentence `Impression` from the facts the graph returns ("Bertha thinks you're trouble, mostly because of what Tomas told her"). Stored and reused next session.

**Shared state (handoff).** When the guard's opinion drops below −0.6, Ilsa `POSTED` a `wanted` Notice at the gate. Any villager who passes the gate `READ`s it and gets a severity-3 rumour with confidence 0.6, sourced from the notice. This is a second, formal channel next to gossip.

---

## 7. Gossip engine (runs every tick)

```
advance_tick():
  1. world.tick += 1
  2. move villagers to schedule positions for this hour            (Q-MOVE)
  3. pairs = co-located villager pairs where listener trusts teller (Q-PAIRS)
  4. for each pair (teller A, listener B), in random order:
       if random() > A.gossip: skip
       candidates = A's beliefs worth sharing that B hasn't heard from A   (Q-CANDIDATES), max 2
       for each candidate rA:
         if B already holds a version of rA's origin: corroborate (Q-CORROBORATE)
         else: create B's version (Q-HOP), text from the distortion ladder,
               phrased by the AI in A's voice (cached; template fallback)
  5. apply procedural rules: guard notice, etc.                     (Q-OPINION, Q-NOTICE)
  6. if tick is midnight: decay (Q-DECAY) + consolidation (Q-CONTEXT → AI → Impression)
```

**Determinism for testing and the demo:** the engine takes a `seed`; the same seed and the same actions give the same spread. The demo uses a fixed seed so the wow moment always happens.

**Concurrency:** each player world is its own graph, so worlds tick independently and in parallel. Within one world, a tick's writes run in a single sequence of queries (simple and safe). Reads for villager replies can run concurrently [verify FalkorDB's concurrency model: reads in parallel, writes serialised per graph].

**AI budget:** the engine itself makes **no AI calls** except to phrase a new rumour version. Phrasings are cached by `(origin_kind, severity, teller)`; if the AI is unavailable or rate-limited, a template like `"{teller_voice}: I heard {ladder_text}."` is used. The game always works.

---

## 8. Agent design

### 8.1 Villager agent (one per villager, same code)
Each time the player talks to a villager:
1. **Perceive:** run `Q-CONTEXT`: persona, beliefs about the player with confidence and source, direct feelings, impression, rules followed, recent conversation history, notices read.
2. **Decide (code, not AI):** compute opinion (`Q-OPINION`), apply the villager's `Rule`s → an **action** from a fixed list: `talk`, `refuse`, `block_gate`, `raise_price`, `discount`, `share_gossip`, `warn_others`.
3. **Speak (AI):** the model gets the persona, the decided action, and only the context from step 1. It returns one or two lines in character.
4. **Remember:** store the conversation as an `Event {kind:'conversation'}` linked by `SPOKE_WITH` to the villager and `ABOUT` the player; if the player was rude or kind (simple keyword/AI check), update `FEELS`.
5. **Explain on request:** "Why?" runs `Q-WHY` and the villager states the chain in its own words; the UI animates the path.

The decision is made from graph data by code, so it's always traceable. The AI can't change it, only voice it.

### 8.2 Villager tools (graph queries exposed as tools)
| Tool | Query | Used for |
| --- | --- | --- |
| `myBeliefsAbout(target)` | Q-BELIEFS | What do I think and how sure am I |
| `whyDoIBelieve(target)` | Q-WHY | Provenance path |
| `opinionOf(target)` | Q-OPINION | Decisions |
| `whoShouldIWarn()` | Q-INFLUENCE-LOCAL | A guard or gossip chooses whom to tell (high-PageRank neighbours) |
| `noticesHere()` | Q-NOTICES | Shared state |

### 8.3 Spymaster agent (the player's assistant)
A helper the player can ask: *"How do I fix my reputation with Captain Ilsa?"* It calls `Q-PAGERANK`, `Q-COMMUNITIES` and `Q-ROUTE`, then explains: *"Ilsa trusts Bertha most. Bertha is at the inn tonight. Do a good deed where Bertha sees it, or whisper it to Pip, who reaches Bertha in one hop."* This is the clearest Track 1 piece: graph algorithms as agent tools, with an action based on the result.

### 8.4 Prompts (start points)

**Villager voice**
```
You are {name}, the {role} of a small village. Personality: {persona}.
You are speaking to a traveller. You have DECIDED to: {action}. Do not change this decision.
What you know about the traveller (and who told you):
{beliefs_with_sources}
Your own experience with them: {feels}. Your overall impression: {impression}.
Rules:
- Use ONLY the facts above. Never mention events or people not listed.
- If you heard something second-hand, say who told you, in your own words.
- Speak in character, 1-2 short sentences, no narration.
```

**Rumour retelling (phrasing only)**
```
Rewrite this as {teller} would say it in passing, in one short sentence.
Story to tell (do not make it worse or better than this): "{ladder_text}"
Personality: {teller_persona}
```

**Consolidation (nightly impression)**
```
In one sentence, summarise what {name} thinks of the traveller, based ONLY on:
{beliefs_with_sources}; direct experience: {feels}.
Mention the main source of the opinion.
```

**Spymaster**
```
You advise a player on how to change what villagers think of them.
Use only these graph results: {pagerank}, {communities}, {routes}, {opinions}, {schedules}.
Give one concrete plan in 2-3 sentences, naming the villager, the place and the time.
```

---
## 9. Cypher query catalogue (the queries the product depends on)

Keep each query in its own file under `backend/queries/` (e.g. `q_why.cypher`) and load them by name. The README links this folder; the rules require listing these queries. Parameters use `$name`. Test every one in FalkorDB Browser first.

> Syntax notes [verify in docs.falkordb.com/cypher]: pattern predicates in `WHERE` (e.g. `NOT (a)-[:R]->(b)`), zero-length paths (`*0..6`), `shortestPath()` placement and direction, and algorithm procedure names. Each query below has a note if it relies on one of these.

### Q-SEED — create the village (run once into `hearsay_template`)
```cypher
CREATE (:World {tick: 6, version: 1})
WITH 1 AS x
UNWIND $places AS pl
CREATE (:Place {id: pl.id, name: pl.name})
```
```cypher
UNWIND $villagers AS v
CREATE (:Villager {id: v.id, name: v.name, role: v.role, gossip: v.gossip,
                   exaggeration: v.exaggeration, sceptic: v.sceptic,
                   persona: v.persona, schedule: v.schedule})
```
```cypher
UNWIND $trust AS t
MATCH (a:Villager {id: t.from}), (b:Villager {id: t.to})
CREATE (a)-[:TRUSTS {weight: t.weight}]->(b)
```
```cypher
UNWIND $rules AS r
MATCH (v:Villager {id: r.villager})
CREATE (v)-[:FOLLOWS]->(:Rule {id: r.id, role: r.role, condition: r.condition,
                               action: r.action, threshold: r.threshold})
```
Seed data lives in `backend/seed/village.json`.

### Q-JOIN — add the player to their world
```cypher
MERGE (p:Player {id: $player})
ON CREATE SET p.name = $name, p.created_tick = $tick
WITH p
MATCH (pl:Place {id: 'well'})
MERGE (p)-[:AT]->(pl)
```

### Q-MOVE — apply schedules for this hour (two queries)
```cypher
MATCH (v:Villager)-[a:AT]->(:Place) DELETE a
```
```cypher
UNWIND $positions AS pos
MATCH (v:Villager {id: pos.villager}), (pl:Place {id: pos.place})
CREATE (v)-[:AT]->(pl)
```
`$positions` is computed in Python from each villager's schedule. At night nobody is placed, so nobody gossips.

### Q-WITNESS — the player does something; whoever is there sees it
```cypher
MATCH (p:Player {id: $player}), (pl:Place {id: $place})
CREATE (e:Event {id: $event, kind: $kind, tick: $tick, juiciness: $juice,
                 sentiment: $sentiment, base_text: $text})
CREATE (e)-[:AT]->(pl)
CREATE (e)-[:ABOUT]->(p)
WITH e, p, pl
MATCH (w:Villager)-[:AT]->(pl)
CREATE (w)-[:WITNESSED {tick: $tick}]->(e)
CREATE (w)-[:HOLDS {confidence: 1.0, since: $tick, last_reinforced: $tick}]->
       (r:Rumour {id: e.id + ':' + w.id, text: e.base_text, severity: 1,
                  sentiment: e.sentiment * 0.2, hops: 0, created_tick: $tick})
CREATE (r)-[:ORIGIN]->(e)
CREATE (r)-[:ABOUT]->(p)
RETURN collect(w.name) AS witnesses
```
If nobody is at the place, the event exists but nobody knows: stealing when nobody's watching works, which is a nice gameplay detail to show.

### Q-PAIRS — who can gossip with whom right now
```cypher
MATCH (a:Villager)-[:AT]->(pl:Place)<-[:AT]-(b:Villager)
MATCH (b)-[t:TRUSTS]->(a)
RETURN a.id AS teller, b.id AS listener, t.weight AS trust, pl.id AS place
```
Read: "A and B are in the same place, and B trusts A, so A can tell B things."

### Q-CANDIDATES — what is A likely to tell B
```cypher
MATCH (a:Villager {id: $teller})-[h:HOLDS]->(r:Rumour)-[:ORIGIN]->(e:Event)
WHERE h.confidence >= 0.2 AND e.kind <> 'conversation'
OPTIONAL MATCH (b:Villager {id: $listener})-[:HOLDS]->(mine:Rumour)-[:ORIGIN]->(e)
OPTIONAL MATCH (mine)-[already:HEARD_FROM]->(r)
OPTIONAL MATCH echo = (r)-[:HEARD_FROM*1..6]->(mine)
WITH r, h, e, mine, already, echo
WHERE already IS NULL AND echo IS NULL AND (mine IS NULL OR mine.hops > 0)
RETURN r.id AS rumour, r.severity AS severity, r.hops AS hops, h.confidence AS conf,
       e.id AS event, e.sentiment AS sentiment, mine.id AS listener_version
ORDER BY e.juiciness * h.confidence DESC
LIMIT 2
```
Three filters explained: `already` = B already heard this exact version from A; `echo` = **echo-chamber guard**: A's version came from B in the first place, so B shouldn't "hear it back" and become more confident; `mine.hops > 0` = B saw it first-hand, so gossip adds nothing.

### Q-HOP — B now believes their own version
```cypher
MATCH (b:Villager {id: $listener}), (src:Rumour {id: $src}),
      (e:Event {id: $event})-[:ABOUT]->(subject)
CREATE (b)-[:HOLDS {confidence: $conf, since: $tick, last_reinforced: $tick}]->
       (r:Rumour {id: $id, text: $text, severity: $severity, sentiment: $sentiment,
                  hops: $hops, created_tick: $tick})
CREATE (r)-[:HEARD_FROM {tick: $tick, place: $place}]->(src)
CREATE (r)-[:ORIGIN]->(e)
CREATE (r)-[:ABOUT]->(subject)
RETURN r.id AS id
```
`$severity`, `$conf`, `$sentiment` and `$hops` come from the Section 6 rules, computed in Python; `$text` from the ladder, phrased by the AI.

### Q-CORROBORATE — B hears the same story from someone else
```cypher
MATCH (b:Villager {id: $listener})-[h:HOLDS]->(mine:Rumour {id: $mine}),
      (src:Rumour {id: $src})
MERGE (mine)-[hf:HEARD_FROM]->(src)
ON CREATE SET hf.tick = $tick, hf.place = $place
SET h.confidence = 1 - (1 - h.confidence) * (1 - $incoming),
    h.last_reinforced = $tick
```

### Q-BELIEFS — what does a villager believe about the player, and from whom
```cypher
MATCH (v:Villager {id: $villager})-[h:HOLDS]->(r:Rumour)-[:ABOUT]->(:Player {id: $player})
WHERE h.confidence >= 0.1
OPTIONAL MATCH (r)-[:HEARD_FROM]->(:Rumour)<-[:HOLDS]-(teller:Villager)
RETURN r.text AS story, r.severity AS severity, h.confidence AS confidence,
       r.hops = 0 AS saw_it, collect(DISTINCT teller.name) AS told_by
ORDER BY confidence DESC
```

### Q-SOURCES — how many different people told this villager (for the sceptic)
```cypher
MATCH (v:Villager {id: $villager})-[:HOLDS]->(r:Rumour)-[:ORIGIN]->(:Event {id: $event})
MATCH (r)-[:HEARD_FROM]->(:Rumour)<-[:HOLDS]-(teller:Villager)
RETURN count(DISTINCT teller) AS sources
```

### Q-OPINION — one number for decisions
```cypher
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
OPTIONAL MATCH (v)-[f:FEELS]->(p)
WITH v, p, coalesce(f.affinity, 0) AS feel
OPTIONAL MATCH (v)-[h:HOLDS]->(r:Rumour)-[:ABOUT]->(p)
WHERE h.confidence >= 0.1
WITH feel, sum(r.sentiment * h.confidence) AS rumours
RETURN feel + rumours AS raw, feel, rumours
```
Clamped to −1..1 in Python. For sceptics, Python drops rumours with fewer than 2 sources first.

### Q-HISTORY — persistent conversation history
```cypher
MATCH (c:Event {kind: 'conversation'})-[:SPOKE_WITH]->(:Villager {id: $villager}),
      (c)-[:ABOUT]->(:Player {id: $player})
RETURN c.base_text AS line, c.tick AS tick
ORDER BY tick DESC
LIMIT 6
```

### Q-REMEMBER-TALK — store a conversation
```cypher
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
CREATE (c:Event {id: $id, kind: 'conversation', tick: $tick, juiciness: 0.1,
                 sentiment: $sentiment, base_text: $summary})
CREATE (c)-[:SPOKE_WITH]->(v)
CREATE (c)-[:ABOUT]->(p)
```

### Q-FEELS — update direct feeling (gifts, rudeness, kindness)
```cypher
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
MERGE (v)-[f:FEELS]->(p)
ON CREATE SET f.affinity = 0
SET f.affinity = CASE
    WHEN f.affinity + $delta > 1 THEN 1
    WHEN f.affinity + $delta < -1 THEN -1
    ELSE f.affinity + $delta END
```

### Q-RULES — procedural memory
```cypher
MATCH (:Villager {id: $villager})-[:FOLLOWS]->(rule:Rule)
RETURN rule.id AS id, rule.condition AS condition, rule.action AS action, rule.threshold AS threshold
```

### Q-WHY — the provenance path (the wow query)
```cypher
MATCH (v:Villager {id: $villager})-[h:HOLDS]->(r:Rumour)-[:ABOUT]->(:Player {id: $player})
WITH r, h ORDER BY h.confidence DESC LIMIT 1
MATCH path = (r)-[:HEARD_FROM*0..6]->(o:Rumour)-[:ORIGIN]->(e:Event)
WHERE o.hops = 0
RETURN [n IN nodes(path) | n.id] AS rumour_ids, e.base_text AS what_happened, e.tick AS at_tick
ORDER BY length(path) ASC
LIMIT 1
```
then resolve who held each version:
```cypher
UNWIND $rumour_ids AS rid
MATCH (holder:Villager)-[:HOLDS]->(ver:Rumour {id: rid})
RETURN holder.name AS who, ver.text AS said, ver.severity AS severity, ver.hops AS hops
ORDER BY hops DESC
```
Relies on zero-length variable paths (`*0..6`) [verify]; if unsupported, run a `*1..6` version and handle the "I saw it myself" case separately.

### Q-NOTICE-POST — the guard shares state with everyone (handoff)
```cypher
MATCH (g:Villager {id: 'ilsa'}), (p:Player {id: $player}),
      (gate:Place {id: 'gate'}), (e:Event {id: $event})
MERGE (n:Notice {id: 'wanted:' + $player})
ON CREATE SET n.kind = 'wanted', n.tick = $tick, n.text = $text
MERGE (g)-[:POSTED]->(n)
MERGE (n)-[:AT]->(gate)
MERGE (n)-[:ABOUT]->(p)
MERGE (n)-[:ORIGIN]->(e)
```

### Q-NOTICE-READ — villagers at the gate read new notices
```cypher
MATCH (v:Villager)-[:AT]->(:Place {id: 'gate'})<-[:AT]-(n:Notice)-[:ABOUT]->(p:Player)
OPTIONAL MATCH (v)-[seen:READ]->(n)
WITH v, n, p, seen
WHERE seen IS NULL
CREATE (v)-[:READ {tick: $tick}]->(n)
RETURN v.id AS reader, n.id AS notice, p.id AS player
```
Python then creates a severity-3 rumour (confidence 0.6) for each reader with `(r)-[:FROM_NOTICE]->(n)` and `ORIGIN` to the notice's event. Q-WHY also follows `FROM_NOTICE` (add `|FROM_NOTICE` to the relationship pattern if needed).

### Q-DECAY — forgetting, nightly
```cypher
MATCH (:Villager)-[h:HOLDS]->(:Rumour)
WHERE h.last_reinforced <= $tick - 24 AND h.confidence >= 0.1
SET h.confidence = h.confidence * 0.97
```

### Q-IMPRESSION — consolidated memory, nightly
```cypher
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
MERGE (v)-[:HAS_IMPRESSION]->(i:Impression {about: $player})
SET i.text = $text, i.updated_tick = $tick
MERGE (i)-[:ABOUT]->(p)
```

### Q-PAGERANK — most influential gossip (algorithm as agent tool)
```cypher
CALL algo.pageRank('Villager', 'TRUSTS') YIELD node, score
RETURN node.name AS villager, score
ORDER BY score DESC
```
`TRUSTS` points from listener to the person they believe, so PageRank flows toward the most-believed villagers. [verify procedure signature]

### Q-COMMUNITIES — cliques
```cypher
CALL algo.labelPropagation({nodeLabels: ['Villager'], relationshipTypes: ['TRUSTS']})
YIELD node, communityId
RETURN communityId, collect(node.name) AS members
```
[verify: FalkorDB's community detection procedure name and config format may differ (e.g. CDLP); use whatever the algorithms page lists]

### Q-BROKER — who connects groups (betweenness)
```cypher
CALL algo.betweenness({nodeLabels: ['Villager'], relationshipTypes: ['TRUSTS']})
YIELD node, score
RETURN node.name AS villager, score
ORDER BY score DESC
```
[verify procedure name and config]

### Q-ROUTE — fastest way for a rumour to reach someone
```cypher
MATCH (s:Villager {id: $start}), (t:Villager {id: $target})
WITH shortestPath((s)<-[:TRUSTS*1..6]-(t)) AS p
RETURN [n IN nodes(p) | n.name] AS route, length(p) AS hops
```
Arrow direction: a rumour flows from A to B when B trusts A, so the path runs against `TRUSTS`. [verify shortestPath support and placement; a weighted version could use a shortest-path algorithm with cost = 1 − trust]

### Q-WARN — whom should I tell (villager tool)
```cypher
MATCH (me:Villager {id: $villager})<-[t:TRUSTS]-(listener:Villager)
RETURN listener.id AS id, listener.name AS name, t.weight AS trust
ORDER BY trust DESC
LIMIT 3
```

### Q-TRUST-VIEW and Q-STATE — for the UI
```cypher
MATCH (a:Villager)-[t:TRUSTS]->(b:Villager)
RETURN a.id AS source, b.id AS target, t.weight AS weight
```
```cypher
MATCH (w:World)
OPTIONAL MATCH (v:Villager)-[:AT]->(pl:Place)
RETURN w.tick AS tick, collect({villager: v.id, place: pl.id}) AS positions
```

---

## 10. AI model usage (free)

| Use | Model | Calls |
| --- | --- | --- |
| Villager replies | Gemma via Google AI Studio free tier (OpenAI-compatible endpoint [verify]) or Ollama locally | 1 per player message |
| Rumour phrasing | Same | Only for new (origin kind, severity, teller) combinations; cached |
| Nightly impressions | Same | Up to 6 per in-game night |
| Spymaster advice | Same | 1 per question |

- One OpenAI-compatible client configured by `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`; switching between hosted and local is an environment change.
- **Graceful fallback:** if the model errors or is rate-limited, replies use templates built from the same graph facts (e.g. *"Hmph. Bertha told me you robbed the stall. Not welcome here."*). The game never breaks in the demo.
- Using Gemma (open weights) also makes the project eligible for Hacktoberfest's "open-source AI" requirement.

---

## 11. Architecture (all free)

```
Browser (React + Vite + react-force-graph-2d)
   │  village view · dialogue · "Why?" · gossip graph · spymaster · inspector
   ▼
FastAPI backend (Python 3.11)
   ├── engine/gossip.py     tick loop: move → pairs → candidates → hop/corroborate → rules → decay
   ├── engine/memory.py     witness, opinion, sources, impressions
   ├── agents/villager.py   perceive (queries) → decide (code) → speak (AI) → remember (query)
   ├── agents/spymaster.py  PageRank / communities / route → advice
   ├── llm.py               OpenAI-compatible client + cache + template fallback
   └── db.py                FalkorDB client; one graph per player: hearsay_<playerId>
   ▼
FalkorDB  (Docker locally · FalkorDB Cloud free tier for the live demo [verify])
```

| Piece | Free option |
| --- | --- |
| FalkorDB | Docker (`falkordb/falkordb:latest`) locally; FalkorDB Cloud free tier for deployment [verify limits] |
| Backend | Render free web service (sleeps when idle; warm it up before judging) or Hacktoberfest Render credits |
| Frontend | Vercel Hobby (free) or Render static site |
| AI | Google AI Studio free tier / Ollama |
| Video | OBS Studio |

If cloud hosting fails, the rules accept **complete local setup instructions**: `docker compose up` must start FalkorDB, seed the village and run the backend.

---

## 12. API

| Method & path | Body / params | Returns |
| --- | --- | --- |
| `POST /api/session` | `{player_id?}` | Creates or loads `hearsay_<id>`, runs catch-up ticks; returns state + "while you were away" summary |
| `GET /api/state` | — | Tick, positions, player place, visible villagers |
| `POST /api/act` | `{action, place?, target?}` | Event created, witnesses, consequences, new tick |
| `POST /api/talk` | `{villager, text}` | Reply, decided action, opinion, and `debug` (queries run + ms) |
| `GET /api/why` | `?villager=` | What happened, chain of who-said-what, path ids, the Cypher used |
| `POST /api/wait` | `{ticks: 1}` | New tick, gossip hops that happened (for animation) |
| `GET /api/spymaster/influence` | — | PageRank, communities, brokers |
| `GET /api/spymaster/route` | `?start=&target=` | Route and hops |
| `POST /api/spymaster/ask` | `{question}` | Plan in plain words + data used |
| `GET /api/graph` | `?view=trust\|rumour&villager=` | Nodes/edges for the graph panel |
| `POST /api/reset` | — | Recreate this player's world from the template |
| `GET /api/health` | — | DB and AI status |

Every response includes `debug.queries: [{name, ms}]` so the inspector can show what the graph did.

---

## 13. UI

1. **Village view (main):** a simple top-down map of 6 places (SVG or CSS grid), villagers as round avatars with initials, moving each tick; your avatar; a clock; a mood ring around each villager showing their opinion of you (red → grey → green).
2. **Action bar:** Talk, Buy, Steal, Help, Gift, Whisper, Pass gate, Wait an hour.
3. **Dialogue panel:** chat with the selected villager, with a big **"Why?"** button.
4. **Gossip graph panel:** `react-force-graph-2d` with villagers as nodes and trust as edges. When a rumour hops, animate a red (bad) or green (good) particle along the edge, with a hover tooltip showing that version's text. "Why?" highlights the chain.
5. **Spymaster panel:** PageRank bars, cliques as coloured groups, a route finder, and an "Ask the spymaster" box.
6. **Under the hood drawer:** last queries with parameters and timings, and the selected villager's memory subgraph. Judges can see that the graph is doing the work.
7. **Welcome-back banner:** *"6 hours have passed. People have been talking…"* with a list of hops that happened while you were away.

Keep it pretty but simple: one font, warm colours, big readable text.

---

## 14. Repository structure

```
hearsay/
├── backend/
│   ├── app/main.py              FastAPI routes
│   ├── app/db.py                FalkorDB connection, select_graph per player, query loader
│   ├── app/llm.py               client, cache, fallbacks
│   ├── app/engine/gossip.py
│   ├── app/engine/memory.py
│   ├── app/agents/villager.py
│   ├── app/agents/spymaster.py
│   ├── queries/                 one .cypher file per query in Section 9
│   ├── seed/village.json        places, villagers, schedules, trust, rules, ladders
│   ├── seed/seed.py
│   ├── tests/
│   └── requirements.txt
├── frontend/                    Vite + React + TypeScript
├── scripts/
│   ├── demo_scenario.py         plays the wow moment with a fixed seed
│   └── load_test.py             many worlds ticking in parallel
├── docs/graph-model.png         diagram for the README
├── docker-compose.yml           falkordb + backend (+ frontend)
├── DECISIONS.md
├── README.md
└── LICENSE (MIT)
```

---
## 15. Tests and measurements

### 15.1 Tests (pytest, against a throwaway test graph)
| Test | Checks |
| --- | --- |
| `test_witness` | Only villagers at the place get `WITNESSED` and a hop-0 rumour |
| `test_nobody_watching` | Theft with nobody present creates no beliefs |
| `test_hop` | Listener gets a new version with `hops + 1`, severity same or +1 (max 5), confidence lower |
| `test_corroboration` | Second teller adds a `HEARD_FROM`, no new node, confidence goes up |
| `test_echo_guard` | B never "hears back" a story that came from B |
| `test_sceptic` | Mira's opinion ignores single-source rumours |
| `test_why_path` | The returned chain matches the scripted spread exactly |
| `test_isolation` | Actions in `hearsay_p1` never appear in `hearsay_p2` |
| `test_determinism` | Same seed + same actions → identical graph |
| `test_no_invented_knowledge` | Over 50 scripted conversations, replies never mention an event or villager name absent from that villager's context (checked against the graph) |
| `test_decay` | Unreinforced beliefs fade; reinforced ones don't |
| `test_fallback` | With the AI disabled, every endpoint still answers |

### 15.2 Measurements to publish (README + blog)
| What | How | Why it matters |
| --- | --- | --- |
| Query latency per query (p50/p95) | Time every query; `debug.queries` | Graph is fast enough for every agent step |
| Turn latency breakdown | Graph time vs AI time per villager reply | Shows the graph isn't the bottleneck |
| Many worlds in one instance | `scripts/load_test.py`: 10 / 100 / 500 worlds ticking in parallel; p95 of Q-BELIEFS + Q-OPINION | Track 2: per-tenant memory and concurrency |
| Spread stats | Median ticks for a theft to reach the guard; average severity on arrival | Fun numbers for the blog |
| Grounding | Invented-knowledge rate from `test_no_invented_knowledge` | Memory comes from the graph, not the model |

Only publish numbers you actually measured.

---

## 16. Build plan (Fri Oct 16 → Sun Oct 18, submit by 8 PM IST Sunday)

### Friday evening — foundations (3–4 hours)
**Step 1: Learn by hand (1 h).** `docker run -p 6379:6379 -p 3000:3000 -it --rm falkordb/falkordb:latest` [verify ports/image], open FalkorDB Browser, create 3 villagers, a few `TRUSTS`, one event and two rumour hops by hand. Run Q-PAIRS, Q-BELIEFS and Q-WHY yourself. Fix any syntax against the docs and update Section 9. *This is what makes you able to explain it.*

**Step 2: Skeleton + seed + engine without AI (2–3 h).**
> **Prompt:** "Read HEARSAY_PRD.md. Create the repo in Section 14. Implement backend/app/db.py (FalkorDB client, one graph per player, loads queries from backend/queries/*.cypher), seed/village.json from Section 4, seed.py using Q-SEED, and engine/gossip.py implementing Section 7 with a seed for determinism, using only the queries in Section 9. No AI yet: use the ladder text directly. Add scripts/demo_scenario.py that steals at the market at tick 11, advances to tick 22 and prints every hop. Add docker-compose.yml."

**Check:** `python scripts/demo_scenario.py` shows the theft travelling Tomas → Bertha → Ilsa with growing severity; you can see it in FalkorDB Browser.

### Saturday — the agent and the game (8–10 hours)
**Step 3: Memory, opinion, rules, "Why?"**
> **Prompt:** "Implement engine/memory.py (Q-WITNESS, Q-OPINION with sceptic rule via Q-SOURCES, Q-FEELS, Q-DECAY) and the procedural rules in Section 4.6. Implement GET /api/why using Q-WHY. Write the tests in Section 15.1 except test_no_invented_knowledge."

**Check:** all tests pass; `/api/why?villager=ilsa` returns the right chain.

**Step 4: Villager agent with AI + fallback.**
> **Prompt:** "Implement llm.py (OpenAI-compatible client from env vars, cache, template fallback) and agents/villager.py per Section 8.1 with the prompts in Section 8.4. Implement POST /api/talk, POST /api/act, POST /api/wait, POST /api/session, GET /api/state with debug timings."

**Check:** Ilsa blocks you after the theft spreads and explains who told her; with `LLM_DISABLED=true`, it still works.

**Step 5: Frontend.**
> **Prompt:** "Build the Vite React frontend per Section 13: village map, action bar, dialogue panel with Why?, gossip graph with react-force-graph-2d animating hops from /api/wait, and the Under-the-hood drawer showing debug.queries."

**Check:** you can play the full wow moment in the browser.

**Step 6: Spymaster.**
> **Prompt:** "Implement agents/spymaster.py and the /api/spymaster routes using Q-PAGERANK, Q-COMMUNITIES, Q-BROKER and Q-ROUTE, plus the spymaster panel."

**Check:** PageRank shows Bertha near the top; route from Pip to Ilsa is correct.

### Sunday — persistence, proof, ship (8 hours; stop building at 4 PM)
**Step 7: Sessions + shared state.** Per-player graphs (copy template or re-seed), catch-up ticks on return, welcome-back banner, guard notice (Q-NOTICE-POST/READ), nightly impressions.
**Check:** close the tab, reopen: the village remembers; a second browser profile gets its own clean village.

**Step 8: Measurements.** Run `test_no_invented_knowledge` and `scripts/load_test.py`; save results to `docs/results.md`.

**Step 9: Deploy.** FalkorDB Cloud free tier [verify] + backend on Render + frontend on Vercel. If anything fails, make sure `docker compose up` works from a fresh clone and document it.

**Step 10 (from 4 PM): README, video, blog, submit.** Sections 17–19. Submit by 8 PM IST.

### Cut list (cut from the top if behind)
1. Spymaster "ask" box (keep the panel numbers)
2. Communities and broker queries (keep PageRank and route)
3. Nightly impressions
4. Guard notice
5. Load test at 500 worlds (keep 10 and 100)
6. Cloud deployment (local setup is accepted)

**Never cut:** witness → gossip → distortion → guard reaction → "Why?" path → persistence across sessions → README with graph model and queries → video.

---

## 17. Demo video (3 minutes max)

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:15 | A game shopkeeper greeting you right after you robbed them (any generic clip or a mock) | "Game characters forget everything. And they never tell each other." |
| 0:15–0:30 | Hearsay village | "Hearsay gives every villager a memory and a social life, stored in a FalkorDB graph." |
| 0:30–0:50 | Steal an apple; only Tomas is there; graph shows Tomas's new belief | "Only Old Tomas saw it." |
| 0:50–1:15 | Wait a few hours: particles travel Tomas → Bertha → Ilsa; tooltips show "took an apple" → "stole a basket" → "robbed the stall" | "At the inn, the story spreads along who trusts whom, and gets worse every time." |
| 1:15–1:35 | Close tab, reopen next "day"; welcome-back banner; Ilsa blocks the gate | "New session. The guard never saw me." |
| 1:35–1:55 | Click **Why?**: path lights up; Ilsa's line; Under-the-hood shows Q-WHY and its timing | "Every belief is traceable. This one Cypher query follows the chain back to what actually happened." |
| 1:55–2:20 | Spymaster: PageRank shows Bertha; route Pip → Bertha → Ilsa; do a good deed in front of Pip; watch the good rumour spread | "Graph algorithms are tools for the agents and the player." |
| 2:20–2:40 | Graph model diagram; load-test numbers; per-player graphs | "One FalkorDB instance, a separate world per player, and queries in milliseconds." |
| 2:40–3:00 | Village at night | "Hearsay is open source. Plug it into your game and your NPCs will finally talk about you." |

---

## 18. Submission checklist (from the rules)

- [ ] Public GitHub repo (MIT licence)
- [ ] README with: what it is, demo GIF, **setup instructions** (cloud link + `docker compose up`), **graph data model** (Section 5 table + diagram), **the Cypher queries and algorithms the product depends on** (link `backend/queries/` and summarise Section 9), architecture, measurements, tracks entered, **AI assistance disclosure** (which tools you used and for what), credits
- [ ] Demo video (YouTube unlisted or Loom), ≤ 3 minutes
- [ ] Live deployment link, or complete local setup instructions
- [ ] Tracks named: **Agent Memory and Coordination** and **Agents That Act on Connected Data**
- [ ] All data synthetic (state this in the README)
- [ ] `DECISIONS.md` filled in
- [ ] Blog post published and linked (for the AirPods side prize)

---

## 19. Blog post (side prize) and optional Hacktoberfest entry

**Title idea:** *"I gave NPCs a graph database. Now the whole village knows I stole an apple."*

Outline:
1. The problem: amnesiac NPCs (one funny example).
2. The idea: memories, beliefs and trust as a graph; one picture of the rumour chain.
3. The graph model, explained simply (Section 5), with 3 key queries (Q-HOP, Q-WHY, Q-PAGERANK) and what each line does.
4. Design choices that made it believable: the distortion ladder, corroboration, the echo-chamber guard, the sceptic, forgetting.
5. Why the AI model doesn't hold the memory (Section 20 answers).
6. Results: latencies, many worlds in one instance, grounding test.
7. What broke and how you fixed it (be honest; judges love this).
8. Try it + repo link.

**Optional Hacktoberfest Week 2 entry (only if both rule pages allow):** same project, framed as *"an open-source NPC memory engine indie game developers would pay for as a hosted API"*. Open-source AI core: Gemma (open weights) + FalkorDB (open source). First user: post it in an indie game dev or gaming Discord and ask one developer to try it; report what they said. Partner extras only if time allows: Render (credits) for hosting, the free .tech domain, Sentry tracing.

---

## 20. Explain it to the judges (prep sheet)

**What is Hearsay in one sentence?**
A memory and gossip engine for game characters where everything they know, believe and feel is a graph, so knowledge spreads realistically and every belief can be traced to its source.

**Why a graph database instead of Postgres or MongoDB?**
The core questions are about chains of unknown length: "how did this rumour reach the guard?" In a graph that's one pattern with a variable-length relationship (`[:HEARD_FROM*0..6]`); in SQL it's a recursive self-join that gets messier and slower as chains grow. Influence and routes are built-in graph algorithms rather than code I'd write.

**Why FalkorDB specifically?**
Fast enough to query on every agent step (it represents the graph as sparse matrices and traverses with linear algebra [verify wording]); thousands of isolated graphs in one instance, which gives each player their own world; built-in algorithms like PageRank and shortest path; open source and runs in Docker; standard Cypher.

**Remove FalkorDB: what still works?**
Nothing that matters. There'd be no memory, no gossip, no "why", no per-player worlds and no influence map. The AI model would just be talking with no knowledge.

**Why not just keep memories in the AI's chat history?**
It grows until it doesn't fit, vanishes between sessions, can't be shared selectively between characters, and can't explain where a belief came from. The graph does all four.

**Where exactly is the AI used?**
Only to turn graph facts into in-character sentences, phrase retellings, write nightly one-line impressions, and phrase the spymaster's plan. Decisions (block the gate, raise prices) are made by code from graph queries. If the AI is off, templates are used and the game still works.

**How does a rumour spread?** (walk through Q-PAIRS → Q-CANDIDATES → Q-HOP)
Every tick, villagers in the same place who trust each other may share their juiciest beliefs. The listener gets their own version: one hop further, slightly less confident, possibly more exaggerated, linked by `HEARD_FROM` to the teller's version and by `ORIGIN` to the real event.

**What stops infinite confidence loops?**
The echo-chamber guard in Q-CANDIDATES: if the teller's version came from the listener, it isn't shared back. Corroboration only counts genuinely new sources.

**What are episodic, semantic and procedural memory here?**
Episodic: `WITNESSED` events and conversations. Semantic: `Rumour` beliefs with confidence, consolidated into `Impression`s. Procedural: `Rule` nodes each villager `FOLLOWS`.

**How do agents coordinate or share state?**
Two channels: informal gossip hops between agents, and formal shared state: the guard posts a `Notice` that other agents read when they pass the gate.

**How is memory separated per user?**
Each player has their own graph, `hearsay_<playerId>`, created from a template. Queries run against one player's graph only, and a test proves no leakage.

**How does it handle concurrency?**
Different players' worlds are separate graphs, so they tick independently and in parallel; the load test shows latency with many worlds at once. Within a world, each tick's writes run in sequence. [verify FalkorDB concurrency model before stating details]

**Why PageRank on TRUSTS?**
`TRUSTS` points from a listener to the person they believe. PageRank rewards villagers believed by many well-believed villagers: exactly "whose word spreads furthest".

**How do you know villagers don't make things up?**
The model only receives facts returned by the graph, and a test over 50 conversations checks replies against each villager's context.

**What did you build vs. what came from libraries?**
Libraries: FalkorDB, its Python client, FastAPI, React, react-force-graph, the AI model. Built by me: the graph model, every query, the gossip and memory engine, the agents, the UI. AI coding assistants were used for [list] and are disclosed in the README.

**What would you do next?**
A Godot/Unity plugin, villagers discovering that a rumour was false and losing trust in the teller, multiple villages, and a hosted API.

---

## 21. Risks

| Risk | Handling |
| --- | --- |
| A Cypher feature isn't supported (zero-length paths, pattern predicates, shortestPath, algorithm names) | Verify each in Step 1; every such query has a fallback note |
| Free AI tier rate limits during the demo | Cache + template fallback; record the video with a warm cache |
| FalkorDB Cloud free tier limits or setup issues | Local `docker compose` is accepted by the rules |
| Render free tier sleeping | Ping it before judging, or use Hacktoberfest credits |
| Gossip feels random or boring | Fixed seed for the demo; tune gossip/exaggeration numbers in `village.json` |
| Running out of time | Cut list in Section 16 |
| Can't explain parts of the code | Write every query yourself in Step 1; keep `DECISIONS.md`; read Section 20 aloud before submitting |

---

## 22. Verify list (Friday, before coding)

- [ ] FalkorDB Docker image, ports, Browser URL
- [ ] Cypher support: variable-length and zero-length paths, pattern predicates in `WHERE`, `shortestPath` usage and direction, `MERGE … ON CREATE SET`, string concatenation, `CASE`
- [ ] Index syntax
- [ ] Algorithm procedure names and signatures: PageRank, community detection (label propagation/CDLP), betweenness, shortest paths
- [ ] Copying a graph for new players (`GRAPH.COPY` or re-seed)
- [ ] FalkorDB concurrency model (reads/writes per graph)
- [ ] FalkorDB Cloud free tier limits and connection details
- [ ] Google AI Studio free tier: Gemma availability, OpenAI-compatible endpoint, rate limits
- [ ] Render and Vercel free tier limits
- [ ] Graph Hacks: submission form fields, video length limit, blog post submission method
- [ ] Hacktoberfest Week 2 and Graph Hacks rules on submitting the same project to both
