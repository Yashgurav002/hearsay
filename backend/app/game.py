"""Player actions (PRD 4.5). Every action except talk/why advances the world one hour."""
from .db import World
from .engine import memory
from .engine.gossip import advance
from .engine.memory import VILLAGE

PLACES = {p["id"]: p["name"] for p in VILLAGE["places"]}
NAMES = {v["id"]: v["name"] for v in VILLAGE["villagers"]}
BASE_PRICE = 10


class GameError(ValueError):
    pass


def here(w: World) -> tuple[int, str, list[str]]:
    st = w.one("world")
    present = [s["id"] for s in w.q("state") if s["place"] == st["place"]]
    return st["tick"], st["place"], present


def price(w: World, player: str) -> float:
    rules = memory.actions_of(w, "tomas")
    op = memory.opinion(w, "tomas", player, rules)
    factor = next(r["threshold"] for r in rules if r["action"] == "scale_price")
    return round(BASE_PRICE * (1 - factor * op), 1)


def gate_check(w: World, player: str) -> dict:
    rules = memory.actions_of(w, "ilsa")
    op = memory.opinion(w, "ilsa", player, rules)
    return {"opinion": op, "blocked": "block_gate" in memory.triggered(rules, op)}


def act(w: World, player: str, action: str, place: str | None = None, target: str | None = None,
        ladder: str | None = None) -> dict:
    tick, at, present = here(w)
    out: dict = {"action": action, "tick": tick, "place": at}
    if action == "go":
        if place not in PLACES:
            raise GameError("unknown place")
        w.q("player_move", player=player, place=place)
        out["place"] = place
    elif action in ("steal", "help"):
        if action == "steal" and at != "market":
            raise GameError("there is nothing to steal here; go to the market")
        out["witnesses"] = memory.witness(w, player, at, "theft" if action == "steal" else "good_deed", tick)
    elif action in ("gift", "whisper"):
        if target not in present:
            raise GameError("they aren't here")
        if action == "gift":
            out["affinity"] = memory.feel(w, target, player, 0.3)
        else:
            if ladder not in memory.LADDERS:
                raise GameError("whisper needs ladder: theft or good_deed")
            memory.whisper(w, player, target, at, ladder, tick)
    elif action == "buy":
        if "tomas" not in present:
            raise GameError("Old Tomas isn't at his stall")
        out["price"] = price(w, player)
    elif action == "pass_gate":
        if at != "gate":
            raise GameError("go to the gate first")
        out.update(gate_check(w, player))
    elif action != "wait":
        raise GameError("unknown action")
    out["hops"] = advance(w, 1)
    out["tick"] = tick + 1
    return out
