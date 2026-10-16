# Reading the graph: what every chart and panel in Hearsay means

Everything the villagers know lives in a **FalkorDB graph**: dots (*nodes*) joined by arrows (*relationships*). The game shows that graph in six places. This guide explains each one, with real numbers from the scripted demo (steal at the market at 7:00–11:00, seed 7) so you can check them yourself.

| Where in the UI | What it shows | Graph behind it |
|---|---|---|
| 1. Faces and meters (right panel), rings at feet (3D) | What each villager thinks of you | `HOLDS` beliefs + `FEELS`, summed by Q-OPINION |
| 2. 📣 Rumour mill (left panel) | Every retelling as it happens | New `Rumour` nodes linked by `HEARD_FROM` |
| 3. 🔍 Why? strip | How one belief reached one villager | A `HEARD_FROM` path, found by Q-WHY |
| 4. 🔭 Spyglass → 🕸️ Who trusts whom | The social network | `TRUSTS` relationships |
| 5. 🔭 Spyglass → 🕵️ Spymaster | Graph algorithms on that network | PageRank, WCC, betweenness, shortest path |
| 6. 🔭 Spyglass → ⚙️ Under the hood | The live queries and every story's memory record | All of the above, raw |

---

## The graph in one picture

```mermaid
graph LR
  Tomas((Old Tomas)) -- WITNESSED --> E[Event: theft at the market]
  Tomas -- HOLDS 1.00 --> R1[Rumour sev 1<br/>took an apple]
  Pip((Pip)) -- HOLDS 0.45 --> R2[Rumour sev 2<br/>stole a basket]
  Bertha((Bertha)) -- HOLDS 0.75 --> R3[Rumour sev 3<br/>robbed the stall]
  Ilsa((Captain Ilsa)) -- HOLDS 0.51 --> R4[Rumour sev 4<br/>robbed the market]
  R2 -- HEARD_FROM --> R1
  R3 -- HEARD_FROM --> R2
  R3 -- HEARD_FROM --> R1
  R4 -- HEARD_FROM --> R3
  R1 & R2 & R3 & R4 -- ORIGIN --> E
  Ilsa -. TRUSTS 0.75 .-> Bertha
  Bertha -. TRUSTS 0.80 .-> Tomas
  Pip -. TRUSTS 0.50 .-> Tomas
```

- An **Event** is what *actually* happened (one node per theft or good deed).
- A **Rumour** is one villager's *version* of it. Every retelling makes a **new** Rumour node for the listener, with its own wording, severity and confidence.
- **HOLDS** (villager → their version) carries **confidence** (0–1): how sure they are.
- **HEARD_FROM** (version → the version it was told from) is the **provenance chain**. Two arrows out of one Rumour means two different people told them (corroboration).
- **ORIGIN** points every version back to the real event, however distorted it got.
- **TRUSTS** (listener → person they believe) carries **weight** (0–1). Gossip flows **against** this arrow: if Ilsa trusts Bertha, Bertha can tell Ilsa things.

---

## 1. Faces, meters and rings: "What they think of you"

Each villager has one **opinion** number from −1 (hates you) to +1 (adores you):

```
opinion = clamp( your direct feeling (gifts, rudeness)  +  Σ over their beliefs about you (sentiment × confidence), −1, +1 )
```

- **Sentiment** of a belief = ±1 × min(1, severity ÷ 3). A theft is negative and a good deed positive, and the worse the version, the stronger it counts.
- The **face**: 😡 ≤ −0.6, 😠 ≤ −0.3, 😒 below −0.05, 😐 neutral, 🙂 above +0.05, 😊 ≥ +0.3, 🤩 ≥ +0.6.
- The **meter** runs red → grey → green, and the dot sits at the opinion. In 3D the **ring at their feet** is the same colour.
- Personalities change the sum, through each villager's `Rule` nodes:
  - **Mira** (sceptic) ignores any rumour with fewer than **two different tellers**.
  - **Father Anselm** ignores gossip and only counts what he saw; a good deed he sees (or a kind gift) resets him to at least neutral.
- Opinions **drive behaviour**:
  - **Ilsa** blocks the gate below −0.3 and posts a wanted notice below −0.6.
  - **Tomas** charges 10 × (1 − 0.5 × opinion).
  - **Bertha** refuses you below −0.5 and shares gossip above +0.3.

*Example:* Ilsa holds "robbed the market" (severity 4 → sentiment −1.0) with confidence 0.505, so her opinion is −0.505. That's below −0.3, so the **gate is blocked**.

## 2. 📣 Rumour mill

One line per gossip event:

- `17:00 Pip → Bertha: "I heard the traveller robbed Tomas's stall."`: a **hop**. Pip told Bertha, and Bertha now holds her own version with those words. Red text means bad news about you; green means good.
- `17:00 Tomas confirmed it to Bertha`: a **corroboration**. Bertha already knew, so no new version was made. A second `HEARD_FROM` arrow was added, and her confidence rose: `new = 1 − (1 − old) × (1 − incoming)`.

Each hop follows fixed rules:
- **Confidence drops** with every hop: listener confidence = teller confidence × how much the listener trusts the teller × 0.9.
- **Severity may go up** one step (out of 5) with the teller's *exaggeration* chance. Pip exaggerates 80% of the time, Bertha 40%, and Mira and Anselm never do.
- It only happens when the two are **in the same place** and the listener **trusts** the teller, and the teller decides to gossip (their *gossip* chance).

*Example from the demo:*

| Hop | Calculation | Confidence |
|---|---|---|
| Tomas saw it | first-hand | **1.00** |
| Tomas → Pip at the market (15:00) | 1.00 × 0.50 (Pip trusts Tomas) × 0.9 | **0.45** (story grew to severity 2) |
| Pip → Bertha at the inn (17:00) | 0.45 × 0.25 (adults barely trust Pip) × 0.9 | **0.10** |
| Tomas confirmed it to Bertha | incoming 1.00 × 0.80 × 0.9 = 0.72, so 1 − 0.9 × 0.28 | **0.75** |
| Bertha → Ilsa at the inn (20:00) | 0.75 × 0.75 × 0.9 | **0.51** (now severity 4, "robbed the market") |

## 3. 🔍 The "Why?" strip

When you ask a villager **Why?**, the game takes their strongest belief about you and follows `HEARD_FROM` arrows backwards (up to 6 hops) until it reaches someone who **saw it first-hand** (or read the wanted notice). It shows each step as a card:

```
👴 Old Tomas  ➜  👩 Bertha  ➜  💂 Captain Ilsa
saw it happen     heard            heard
"took an apple"   "robbed the      "robbed the market"
🔥 a small thing   stall" 🔥🔥🔥     🔥🔥🔥🔥 scandalous
✔ What actually happened at 07:00: the traveller took an apple from Tomas's stall
```

- **Read left to right** to follow the story from the source to the person you asked.
- **The flames** are the severity (1–5). Watch them grow along the chain: that's the distortion.
- **The green box** is the real event (the `Event` node). Compare it with the last card to see how much the truth drifted.
- When there are two possible chains (Bertha heard it from Pip *and* from Tomas), it shows the **shortest** one.
- **"For the curious"** opens the exact Cypher query that found this path (Q-WHY):
  ```cypher
  MATCH path = (r)-[:HEARD_FROM*0..6]->(o:Rumour)-[:ORIGIN]->(e:Event)
  WHERE o.hops = 0 OR (o)-[:FROM_NOTICE]->(:Notice)
  ```
  `*0..6` means "follow zero to six HEARD_FROM arrows". Zero covers "I saw it myself".

## 4. 🔭 Spyglass → 🕸️ Who trusts whom

A live network diagram of the six villagers.

| What you see | Meaning |
|---|---|
| **A circle with initials** (Be, To, Il…) | A villager. The **ring colour** is their opinion of you, same as the faces |
| **An arrow from A to B** | **A can pass gossip to B**, because B trusts A. (The database stores `B -TRUSTS-> A`; the picture draws the direction stories travel) |
| **Arrow thickness** | How much B trusts A (0.25 thin … 0.9 thick). Thicker means the story arrives with more confidence |
| **A moving red/green dot along an arrow** | A rumour hopping right now (red bad, green good). It animates while the Spyglass is open and time passes |
| **Hover over an arrow** | "Ilsa trusts Bertha (0.75)", plus the last thing said along it |
| **Gold, thick arrows** | The route found by the Spymaster's route finder (below) |
| **No arrow between two people** | They never pass stories directly, e.g. Ilsa doesn't listen to Pip or Tomas |

The 20 trust edges (listener → who they believe, weight):

| Listener | Believes |
|---|---|
| Tomas | Bertha 0.8 · Mira 0.3 |
| Bertha | Tomas 0.8 · Ilsa 0.6 · Mira 0.5 · Anselm 0.5 · Pip 0.25 |
| Ilsa | Bertha 0.75 · Anselm 0.5 |
| Mira | Anselm 0.9 · Bertha 0.4 · Pip 0.25 |
| Anselm | Mira 0.7 · Bertha 0.4 · Pip 0.25 |
| Pip | Bertha 0.6 · Ilsa 0.6 · Tomas 0.5 · Mira 0.5 · Anselm 0.5 |

**How to use it:** to change someone's mind, find the arrows **pointing into** them and follow those back to the people they listen to. Everything reaching Ilsa comes through Bertha or Anselm.

## 5. 🔭 Spyglass → 🕵️ Spymaster

Four graph algorithms that run inside FalkorDB on the trust network:

| Panel | Algorithm | How to read it | Demo values |
|---|---|---|---|
| **Most influential gossip** | **PageRank** over `TRUSTS` (`algo.pageRank`) | A villager scores high when many people believe them, *and* those people are themselves widely believed. A longer bar means their word spreads further | Bertha **0.16**, Mira and Anselm 0.12, Pip 0.11, Tomas and Ilsa 0.06 |
| **Cliques** | **Weakly connected components** over *strong* trust (≥ 0.6) (`algo.WCC`) | Groups held together by strong trust. A story that enters a group circulates inside it | *The inn crowd*: Tomas, Bertha, Ilsa, Pip. *The chapel pair*: Mira, Anselm |
| **Brokers** | **Betweenness centrality** (`algo.betweenness`) | How often someone sits on the shortest path between two others. High means they're the bridge; remove them and stories stop crossing | Bertha **17**, Pip 7, Mira 3, Anselm 2 |
| **Fastest rumour route** | **shortestPath** against `TRUSTS` | The fewest hops for a story you tell person A to reach person B. Press *Find* and the route lights up gold in the network view | Tell **Pip → Bertha → Ilsa** (2 hops) |

**Ask the spymaster** takes a question ("How do I fix my reputation with Captain Ilsa?"). It reads these results plus everyone's opinions and schedules, and gives a plan: *"Captain Ilsa trusts Bertha most (0.75). Bertha will be at The Crooked Kettle from 10:00: do a good deed where they can see it, or whisper it to Pip, who reaches them in 1 hop."*

## 6. 🔭 Spyglass → ⚙️ Under the hood

The raw machinery, for judges and the curious.

- **"Last request: 31 ms total · graph 12.4 ms over 9 queries · AI 18 ms"**: the cost of your last action. *Graph* is time spent in FalkorDB; *AI* is time waiting for the language model (if a reply was written).
- **The numbered list** (`tick 0.6 ms`, `villagers 1.1 ms`, `pairs 0.9 ms`, `candidates 1.4 ms`, `hop 1.2 ms` …) is every Cypher query that action ran, in order, with its time. **Click a name** to see the query itself. Each lives in its own file in `backend/queries/`.
- **The memory subgraph** lists every version of every story about you:
  ```
  theft-7-market:bertha  bertha · sev 3 · hops 2 · conf 0.75
  "I heard the traveller robbed Tomas's stall." ← theft-7-market:pip, theft-7-market:tomas
  ```
  - `theft-7-market:bertha`: the Rumour's id, `<event>:<who holds it>` (the theft at 7:00 at the market, Bertha's version).
  - `sev 3`: severity on the 1–5 ladder.
  - `hops 2`: how many retellings from a witness (0 means they saw it).
  - `conf 0.75`: how sure Bertha is.
  - `← theft-7-market:pip, theft-7-market:tomas`: her `HEARD_FROM` arrows. Two sources, so she was corroborated.

## Severity ladders (what the flames mean)

| 🔥 | Theft | Good deed |
|---|---|---|
| 1 | took an apple from Tomas's stall | fetched water for Father Anselm |
| 2 | stole a basket of apples | helped at the chapel all morning |
| 3 | robbed Tomas's stall | is always helping people |
| 4 | robbed the market | saved the chapel |
| 5 | is part of a gang of thieves | is practically a saint |

The words a villager uses can be rephrased by the AI in their own voice ("Oh my stars, the traveller just snatched Tomas's stuff!"), but the **severity number is decided by the engine**, so the distortion is real and traceable, not invented by the model.
