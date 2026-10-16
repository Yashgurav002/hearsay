# How to play Hearsay

> **The idea in one line:** every villager remembers what they see you do, gossips about it along their friendships, makes the story a bit worse each time it's retold, and then treats you based on what they've *heard*. Your job is to survive the gossip.

## Start the game

1. Start FalkorDB and the server (see the README), then open **http://localhost:8000**.
2. On the title screen press **▶ New game**. **Continue** brings back your saved village (it's stored per browser).
3. The game opens in **3D**. The **🗺️ 2D map** button in the top bar switches to a top-down map; it plays exactly the same.

## Controls

| What | 3D view | 2D view |
|---|---|---|
| Walk | **W A S D** or **arrow keys** (relative to the camera) | **W A S D** / arrow keys |
| Walk somewhere | **Click** the ground | **Click** the map |
| Look around | **Drag** with the mouse (or finger) | — |
| Zoom | **Scroll wheel** | — |
| Talk to someone nearby | **E** (or click them) | **E** (or click them) |
| Do the actions under the map | Click the buttons, or press the **number keys 1–6** shown on them | same |
| Wait an hour | **Space** | **Space** |
| Close a window | **Esc** | **Esc** |

## The screen

```
┌────────────┬──────────────────────────────────────┬─────────────────────┐
│ QUEST CARD │                                      │ WHAT THEY THINK     │
│ your goal  │          THE VILLAGE (3D/2D)         │ OF YOU              │
│ + a hint   │   speech bubbles = gossip happening  │ 😡 … 😐 … 🤩 per     │
├────────────┤                                      │ villager + a meter  │
│ 📣 RUMOUR  │                                      │ (click anyone to    │
│ MILL: who  │                                      │ talk or ask “Why?”) │
│ told whom  ├──────────────────────────────────────┤                     │
│            │  ACTION BAR: 1 Steal · 2 Help · …    │                     │
└────────────┴──────────────────────────────────────┴─────────────────────┘
 Top bar: clock (Day · hour) · 🪙 coins · ❓ How to play · 🏆 achievements · 🗺️/🧊 view · 🔭 Spyglass
```

- **Clock.** Time moves **one hour per action** (walking into a place, stealing, helping, gifts, waiting). Talking and asking "Why?" are free. Villagers follow daily routines: the morning at the well, the day at work, the **evening (17:00–23:00) at the inn**, the night asleep at home (💤).
- **Places.** The Well ⛲, the Market 🍎, the Forge ⚒️, St. Aldric's Chapel ⛪, the Crooked Kettle inn 🍺, the Town Gate 🏰. Walking *into* a place is what moves you there (it costs an hour). The place you're in glows gold.
- **Faces and rings.** Each villager's face (right panel) and the ring at their feet (3D) show what they think of you: red 😡/😠 hostile, grey 😐 neutral, green 😊/🤩 friendly.
- **Speech bubbles.** A red bubble is bad news about you being passed on, a green one is good news. The listener reacts (😮, 😊). The 📣 **Rumour mill** keeps a log of every retelling with the exact words.

## The story (7 quests)

The quest card always says what to do next and gives a hint.

| # | Quest | What you do | What you learn |
|---|---|---|---|
| 1 | **Find something to eat** | Walk to the Market 🍎 | Movement; entering a place costs an hour |
| 2 | **A five-finger discount** | Press **🍎 Steal an apple** (you have 5 coins, apples cost 10) | Whoever is standing there *witnesses* it. Old Tomas sees you, and his face turns angry |
| 3 | **Word gets around** | Press **⏩ Skip to evening**, then **⏩ Skip to night**, and watch | Gossip only flows between people who **trust** each other, and the story gets **exaggerated** with each retelling ("took an apple" → "stole a basket" → "robbed the market"). Captain Ilsa hears it at the inn around 20:00 |
| 4 | **Time to leave town** | Walk to the Town Gate 🏰, press **🚪 Leave town** | The guard **blocks** you, though she never saw a thing. Characters act on what they *believe* |
| 5 | **Who told her?** | Click Ilsa (right panel or in the world), press **🔍 Why do you think that about me?** | A comic strip traces the rumour back to the source: who saw it, who passed it on, and how it changed at every step |
| 6 | **Clear your name** | Change what Ilsa believes about you | See below. This is the puzzle |
| 7 | **Freedom** | Go back to the gate and leave | You win: see your stats (hours, versions of stories about you, the worst thing said, the biggest gossip) |

### How to solve quest 6 (spoilers)

Ilsa trusts **Bertha** (the innkeeper) most. Anything Bertha believes about you reaches Ilsa when they meet at the inn in the evening.
- **Do a good deed where Bertha can see it:** go to the inn after 10:00 (Bertha works there) and press **🤝 Help out**. Bertha witnesses it and you get a 2-coin tip. That evening Bertha tells Ilsa, and Ilsa's opinion rises.
- **Or whisper a good story:** talk to someone (Pip, who tells everyone, is a good choice) and use **🤫 Whisper: "the traveller helps people"**. Whispered stories spread like any other, but people trust a stranger's word less.
- **Don't bribe the guard:** a gift to a guard who already distrusts you is a bribe. It makes things worse (and earns the "Nice try" achievement).
- Stuck? Open **🔭 Spyglass → 🕵️ Spymaster**. The quest card also shows the spymaster's plan, worked out from the trust graph.

## Everything you can do

| Action | Where | Effect |
|---|---|---|
| 🍎 Steal an apple | Market | Creates a theft. Everyone there witnesses it |
| 🪙 Buy an apple | Market, with Tomas there | Price = 10 × (1 − 0.5 × Tomas's opinion). Thieves pay more |
| 🤝 Help out | Any place | A good deed. Witnesses remember it, and it spreads too. +2 🪙 tip if someone saw |
| 🎁 Give a gift (2 🪙) | Talking to someone | Raises their own feeling about you, unless it's a suspicious guard (bribe) |
| 🤫 Whisper | Talking to someone | Plants a story (good or bad) in their head; it spreads normally |
| 💬 Talk | Near someone (**E**) | Type anything or use the quick replies. They answer **only from what the graph says they know**, in character |
| 🔍 Why? | Talking to anyone (even far away) | Shows the exact chain of who told whom |
| 🚪 Leave town | Gate | The guard decides from her opinion of you |
| ⏳ Wait / ⏩ Skip | Anywhere | Let time pass. Skip stops at 17:00 (evening), 22:00 (night) and 07:00 (morning) |

## Achievements (🏆)
👻 **Ghost**: steal when nobody is watching (try the market at night) · 📜 **Wanted**: get a wanted notice posted at the gate (make the guard *really* angry) · 😇 **Practically a saint**: make anyone adore you · 🔨 **Convince the sceptic**: Mira only believes things she hears from two different people · 🌀 **Spin doctor**: whisper a story that gets retold 3 times · 💰 **Nice try**: bribe the guard · 🏆 **Escape artist**: finish the story.

## Tips
- **Who's in the room matters.** Nothing is remembered unless someone sees it, and each villager only passes stories on to people who trust them.
- **Pip tells everyone**, but adults don't trust a child much. **Father Anselm** never gossips and forgives good deeds. **Mira** needs two sources.
- **Come back later.** Close the tab and press **Continue** next time: the village has carried on without you ("🌙 9 hours have passed…") and shows what was said while you were away.
- Curious how it works? **🔭 Spyglass** shows the live graph. See [READING_THE_GRAPH.md](READING_THE_GRAPH.md).
