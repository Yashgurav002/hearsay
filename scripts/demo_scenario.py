"""The wow moment, scripted: steal at the market at tick 11, let the village talk until tick 22."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
os.environ.setdefault("LLM_DISABLED", "true")
from app import game  # noqa: E402
from app.db import World  # noqa: E402
from seed.seed import seed  # noqa: E402

PLAYER = "demo0001"


def run(player=PLAYER, quiet=False, reseed=True):
    if reseed:
        seed()
    w = World.create(player)
    say = (lambda *a: None) if quiet else print
    while w.one("world")["tick"] < 10:
        game.act(w, player, "wait")
    game.act(w, player, "go", place="market")  # arrive at tick 11
    r = game.act(w, player, "steal")
    say(f"tick {r['tick'] - 1}: stole at the market, witnesses: {r['witnesses']}")
    while w.one("world")["tick"] < 22:
        for h in game.act(w, player, "wait")["hops"]:
            say(f"tick {h['tick']:>2} @{h['place']:<6} {h['teller']:>6} -> {h['listener']:<6} "
                f"{h['kind']:<11} sev {h['severity']} conf {h['confidence']:.2f}  {h['text'] or ''}")
    for v in game.NAMES:
        say(f"{v:<7} opinion {game.memory.opinion(w, v, player):+.2f}")
    say("gate:", game.gate_check(w, player))
    return w


if __name__ == "__main__":
    run()
