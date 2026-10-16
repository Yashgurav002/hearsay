"""FalkorDB access: one graph per player world, queries loaded by name from backend/queries/."""
import os
import re
import threading
import time
from pathlib import Path

from falkordb import FalkorDB

QUERY_DIR = Path(__file__).resolve().parent.parent / "queries"
QUERIES = {p.stem: p.read_text() for p in QUERY_DIR.glob("*.cypher")}
TEMPLATE = "hearsay_template"
PLAYER_ID = re.compile(r"^[a-z0-9]{6,32}$")

_client = FalkorDB(
    host=os.getenv("FALKORDB_HOST", "127.0.0.1"),
    port=int(os.getenv("FALKORDB_PORT", "6379")),
    username=os.getenv("FALKORDB_USERNAME") or None,
    password=os.getenv("FALKORDB_PASSWORD") or None,
)
# ponytail: per-world lock in one process; needs a distributed lock if the backend scales out
_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def client() -> FalkorDB:
    return _client


def graph_name(player: str) -> str:
    if not PLAYER_ID.match(player):
        raise ValueError("bad player id")
    return f"hearsay_{player}"


def graph_exists(name: str) -> bool:
    return name in _client.list_graphs()


class World:
    """A handle on one graph. Every query is timed into `debug` so the UI can show it."""

    def __init__(self, name: str):
        self.name = name
        self.g = _client.select_graph(name)
        self.debug: list[dict] = []

    @classmethod
    def for_player(cls, player: str) -> "World":
        return cls(graph_name(player))

    def lock(self) -> threading.Lock:
        with _locks_guard:
            return _locks.setdefault(self.name, threading.Lock())

    def q(self, name: str, **params) -> list[dict]:
        t = time.perf_counter()
        res = self.g.query(QUERIES[name], params)
        self.debug.append({"name": name, "ms": round((time.perf_counter() - t) * 1000, 2)})
        cols = [h[1] for h in res.header]
        return [dict(zip(cols, row)) for row in res.result_set]

    def one(self, name: str, **params) -> dict:
        rows = self.q(name, **params)
        return rows[0] if rows else {}

    @classmethod
    def create(cls, player: str) -> "World":
        """A fresh village for this player: GRAPH.COPY of the template, then the player joins."""
        w = cls.for_player(player)
        w.delete()
        _client.select_graph(TEMPLATE).copy(w.name)
        w = cls.for_player(player)
        w.q("join", player=player, tick=w.one("world")["tick"])
        return w

    def delete(self) -> None:
        if graph_exists(self.name):
            self.g.delete()
