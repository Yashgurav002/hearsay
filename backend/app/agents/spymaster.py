"""Spymaster (PRD 8.3): graph algorithms as tools for the player's adviser."""
import json

from .. import llm
from ..db import World
from ..engine import memory
from ..game import NAMES, PLACES


def influence(w: World) -> dict:
    return {"pagerank": w.q("pagerank"), "communities": w.q("communities"), "brokers": w.q("broker")}


def route(w: World, start: str, target: str) -> dict:
    r = w.one("route", start=start, target=target)
    if not r or r["hops"] is None:
        return {"route": [], "ids": [], "hops": None}
    if r["ids"][0] != start:  # FalkorDB returns the path in traversal order, which can be target-first
        r["ids"], r["route"] = r["ids"][::-1], r["route"][::-1]
    return r


def where_later(schedule: str, tick: int) -> str:
    """Next place this villager will be (from their schedule), as 'the inn at 17:00'."""
    for dt in range(1, 25):
        hour = (tick + dt) % 24
        for start, end, place in json.loads(schedule):
            if hour == start:
                return f"{PLACES[place]} from {start}:00"
    return "around the village"


def ask(w: World, player: str, question: str) -> dict:
    vs = {v["id"]: v for v in w.q("villagers")}
    tick = w.one("world")["tick"]
    opinions = {vid: memory.opinion(w, vid, player) for vid in vs}
    q = question.lower()
    mentioned = [vid for vid in vs if vid in q or NAMES[vid].lower() in q]
    target = mentioned[0] if mentioned else min(opinions, key=opinions.get)
    trusted = w.q("trusted_by", villager=target)
    pr = influence(w)["pagerank"]
    data = {"target": target, "opinions": opinions, "trusted_by_target": trusted, "pagerank": pr[:3]}
    if not trusted:
        plan = f"{NAMES[target]} listens to nobody. Do a good deed right in front of them."
    else:
        via = trusted[0]
        r = route(w, "pip", via["id"])
        data["route_from_pip"] = r
        plan = (f"{NAMES[target]} trusts {via['name']} most ({via['trust']:.2f}). {via['name']} will be at "
                f"{where_later(vs[via['id']]['schedule'], tick)}: do a good deed where they can see it")
        plan += (f", or whisper it to Pip, who reaches them in {r['hops']} hop{'s' if r['hops'] != 1 else ''}."
                 if r["hops"] and via["id"] != "pip" else ".")
    prompt = (f"You advise a player on how to change what villagers think of them. Question: \"{question}\".\n"
              f"Use only these graph results: {json.dumps(data, default=str)}.\n"
              f"Draft plan: {plan}\nGive one concrete plan in 2-3 sentences, naming the villager, the place and the time.")
    return {"plan": llm.chat(prompt, plan, max_tokens=160, debug=w.debug), "data": data}
