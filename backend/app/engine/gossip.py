"""The tick loop (PRD section 7): move -> pairs -> candidates -> hop/corroborate -> rules -> nightly decay.
Randomness comes from Random(f"{seed}:{tick}"), so the same seed and actions give the same spread."""
import json
import random

from .. import llm
from ..db import World
from . import memory
from .memory import HOP_LOSS, LADDERS, rumour_sentiment, story


def positions(villagers, hour: int) -> list[dict]:
    out = []
    for v in villagers:
        for start, end, place in json.loads(v["schedule"]):
            if start <= hour < end:
                out.append({"villager": v["id"], "place": place})
                break
    return out


def retell(teller: dict, ladder: str, severity: int, debug: list) -> str:
    fallback = f"I heard {story(ladder, severity)}."
    prompt = (f"Rewrite this as {teller['name']} would say it in passing, in one short sentence. "
              f"Call the person 'the traveller'.\n"
              f"Story to tell (do not make it worse or better than this): \"{story(ladder, severity)}\"\n"
              f"Personality: {teller['persona']}")
    return llm.cached((ladder, severity, teller["id"]), prompt, fallback, debug)


def tick_once(w: World) -> list[dict]:
    t = w.one("tick")
    tick, seed = t["tick"], t["seed"]
    vs = {v["id"]: v for v in w.q("villagers")}
    w.q("move_clear")
    w.q("move_place", positions=positions(vs.values(), tick % 24))
    rng = random.Random(f"{seed}:{tick}")
    pairs = w.q("pairs")
    rng.shuffle(pairs)
    hops = []
    for p in pairs:
        teller = vs[p["teller"]]
        if rng.random() >= teller["gossip"]:
            continue
        for c in w.q("candidates", teller=p["teller"], listener=p["listener"]):
            incoming = round(c["conf"] * p["trust"] * HOP_LOSS, 4)
            hop = {"tick": tick, "place": p["place"], "teller": p["teller"], "listener": p["listener"],
                   "event": c["event"], "sentiment": c["sentiment"]}
            if c["listener_version"]:
                conf = w.one("corroborate", listener=p["listener"], mine=c["listener_version"], src=c["rumour"],
                             tick=tick, place=p["place"], incoming=incoming)["confidence"]
                hops.append({**hop, "kind": "corroborate", "severity": c["severity"], "confidence": round(conf, 3),
                             "text": None})
                continue
            sev = min(5, c["severity"] + 1) if rng.random() < teller["exaggeration"] else c["severity"]
            text = retell(teller, c["ladder"], sev, w.debug)
            w.q("hop", listener=p["listener"], src=c["rumour"], event=c["event"], id=f"{c['event']}:{p['listener']}",
                text=text, severity=sev, sentiment=rumour_sentiment(c["ladder"], sev), hops=c["hops"] + 1,
                conf=incoming, tick=tick, place=p["place"])
            hops.append({**hop, "kind": "hop", "severity": sev, "confidence": incoming, "text": text})
    player = w.one("world").get("player")
    if player:
        apply_rules(w, player, vs, tick)
        if tick % 24 == 0:
            w.q("decay", tick=tick)
            for v in vs.values():
                memory.consolidate(w, player, v, tick)
    return hops


def apply_rules(w: World, player: str, vs: dict, tick: int) -> None:
    """Shared state: a guard whose opinion crosses post_notice puts up a wanted notice; readers believe it."""
    for v in vs.values():
        if "post_notice" not in v["actions"]:
            continue
        rules = memory.actions_of(w, v["id"])
        if "post_notice" not in memory.triggered(rules, memory.opinion(w, v["id"], player, rules)):
            continue
        bad = [b for b in w.q("beliefs", villager=v["id"], player=player) if b["sentiment"] < 0]
        if not bad:
            continue
        worst = min(bad, key=lambda b: b["sentiment"] * b["confidence"])
        w.q("notice_post", player=player, event=worst["event"], tick=tick,
            text=f"WANTED: the traveller, who {LADDERS[worst['ladder']][2]}. By order of {v['name']}.")
    for r in w.q("notice_read", tick=tick):
        w.q("notice_rumour", reader=r["reader"], notice=r["notice"], tick=tick,
            text=f"The notice at the gate says {story(r['ladder'], 3)}.", sentiment=rumour_sentiment(r["ladder"], 3))


def advance(w: World, ticks: int = 1) -> list[dict]:
    hops = []
    for _ in range(ticks):
        hops += tick_once(w)
    return hops


def catch_up_ticks(tick: int, minimum: int = 6, wake_hour: int = 7) -> int:
    """A returning player arrives the next morning: at least `minimum` hours later, at wake_hour or after."""
    n = minimum
    while (tick + n) % 24 < wake_hour or (tick + n) % 24 >= 23:
        n += 1
    return n
