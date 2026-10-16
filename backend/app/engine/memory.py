"""Witnessing, opinion (with each villager's rules), feelings, impressions. Maths in PRD section 6."""
import json
from collections import Counter
from pathlib import Path

from ..db import World

VILLAGE = json.loads((Path(__file__).resolve().parents[2] / "seed" / "village.json").read_text(encoding="utf-8"))
LADDERS = VILLAGE["ladders"]
SENTIMENT = {"theft": -1.0, "good_deed": 1.0}
JUICE = {"theft": 0.9, "good_deed": 0.6}
HOP_LOSS = 0.9


def story(ladder: str, severity: int) -> str:
    return "the traveller " + LADDERS[ladder][severity - 1]


def rumour_sentiment(ladder: str, severity: int) -> float:
    # severity 3+ carries the full weight of the event; an apple is a third as bad as a robbery
    return round(SENTIMENT[ladder] * min(1.0, severity / 3), 3)


def witness(w: World, player: str, place: str, ladder: str, tick: int) -> list[str]:
    row = w.one("witness", player=player, place=place, event=f"{ladder}-{tick}-{place}", kind=ladder,
                ladder=ladder, tick=tick, juice=JUICE[ladder], sentiment=SENTIMENT[ladder],
                text=story(ladder, 1), rumour_sentiment=rumour_sentiment(ladder, 1))
    return row.get("witnesses", [])


def whisper(w: World, player: str, listener: str, place: str, ladder: str, tick: int) -> str:
    # the listener half-believes a stranger: confidence 0.5
    return w.one("whisper", player=player, listener=listener, place=place, event=f"whisper-{tick}-{listener}",
                 ladder=ladder, tick=tick, juice=JUICE[ladder], sentiment=SENTIMENT[ladder],
                 text=story(ladder, 1), rumour_sentiment=rumour_sentiment(ladder, 1), conf=0.5)["id"]


def actions_of(w: World, villager: str) -> list[dict]:
    return w.q("rules", villager=villager)


def opinion(w: World, villager: str, player: str, rules: list[dict] | None = None) -> float:
    rules = actions_of(w, villager) if rules is None else rules
    acts = {r["action"] for r in rules}
    row = w.one("opinion", villager=villager, player=player)
    terms = [t for t in row["terms"] if t["conf"] is not None]
    if "ignore_gossip" in acts:
        terms = [t for t in terms if t["hops"] == 0]
    if "need_two_sources" in acts:
        terms = [t for t in terms if t["hops"] == 0 or t["sources"] >= 2]
    total = row["feel"] + sum(t["sentiment"] * t["conf"] for t in terms)
    if "forgive" in acts and (row["feel"] > 0 or any(t["sentiment"] > 0 for t in terms)):
        total = max(total, 0.0)
    return round(max(-1.0, min(1.0, total)), 3)


def triggered(rules: list[dict], op: float) -> list[str]:
    out = []
    for r in rules:
        c = r["condition"]
        if c == "always" or (c == "opinion_below" and op < r["threshold"]) or (c == "opinion_above" and op > r["threshold"]):
            out.append(r["action"])
    return out


def feel(w: World, villager: str, player: str, delta: float) -> float:
    return w.one("feels", villager=villager, player=player, delta=delta)["affinity"]


def mood(op: float) -> str:
    if op < -0.3:
        return "trouble"
    if op < -0.05:
        return "not to be trusted"
    if op > 0.3:
        return "a good sort"
    if op > 0.05:
        return "decent enough"
    return "hard to read"


def consolidate(w: World, player: str, villager: dict, tick: int) -> str | None:
    """Nightly: one sentence per villager, from graph facts only."""
    beliefs = w.q("beliefs", villager=villager["id"], player=player)
    if not beliefs:
        return None
    op = opinion(w, villager["id"], player)
    sources = Counter(n for b in beliefs for n in b["told_by"])
    source = f"what {sources.most_common(1)[0][0]} told them" if sources else "what they saw themselves"
    fallback = f"{villager['name']} thinks you're {mood(op)}, mostly because of {source}."
    # ponytail: template wording only; six AI calls every midnight queued ahead of live replies on a local model
    w.q("impression", villager=villager["id"], player=player, text=fallback, tick=tick)
    return fallback
