"""Build the read-only template village (hearsay_template). New players get a GRAPH.COPY of it."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.db import QUERIES, TEMPLATE, World  # noqa: E402
from app.engine.gossip import positions  # noqa: E402
from app.engine.memory import VILLAGE  # noqa: E402


def seed(name: str = TEMPLATE, seed_value: int = 7) -> World:
    w = World(name)
    w.delete()
    w = World(name)
    w.q("seed_places", tick=VILLAGE["start_tick"], seed=seed_value, places=VILLAGE["places"])
    villagers = [{**v, "schedule": json.dumps(v["schedule"])} for v in VILLAGE["villagers"]]
    w.q("seed_villagers", villagers=villagers)
    w.q("seed_trust", trust=VILLAGE["trust"])
    w.q("seed_rules", rules=VILLAGE["rules"])
    w.q("seed_close")
    for stmt in QUERIES["indexes"].split(";"):
        w.g.query(stmt)
    w.q("move_place", positions=positions(villagers, VILLAGE["start_tick"] % 24))
    return w


if __name__ == "__main__":
    w = seed()
    print(w.q("state"))
    print(len(w.q("trust_view")), "trust edges")
