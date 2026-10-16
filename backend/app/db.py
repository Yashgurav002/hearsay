"""FalkorDB access: one graph per player world, queries loaded by name from backend/queries/."""
import os
import re
import threading
import time
from pathlib import Path

from falkordb import FalkorDB

QUERY_DIR = Path(__file__).resolve().parent.parent / "queries"
QUERIES = {p.stem: p.read_text(encoding="utf-8") for p in QUERY_DIR.glob("*.cypher")}
TEMPLATE = "hearsay_template"
START_COINS = 5
QUERY_TIMEOUT_MS = int(os.getenv("QUERY_TIMEOUT_MS", "10000"))  # FalkorDB's default is 1 s
PLAYER_ID = re.compile(r"^[a-z0-9]{6,32}$")

_client: FalkorDB | None = None  # connected on first use, so a database outage doesn't break importing the app


def client() -> FalkorDB:
    global _client
    if _client is None:
        _client = FalkorDB(
            host=os.getenv("FALKORDB_HOST", "127.0.0.1"),
            port=int(os.getenv("FALKORDB_PORT", "6379")),
            username=os.getenv("FALKORDB_USERNAME") or None,
            password=os.getenv("FALKORDB_PASSWORD") or None,
            ssl=os.getenv("FALKORDB_SSL", "").lower() in ("1", "true", "yes"),
        )
    return _client
# ponytail: per-world lock in one process; needs a distributed lock if the backend scales out
_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()
_copy_lock = threading.Lock()


def graph_name(player: str) -> str:
    if not PLAYER_ID.match(player):
        raise ValueError("bad player id")
    return f"hearsay_{player}"


def graph_exists(name: str) -> bool:
    return name in client().list_graphs()


class World:
    """A handle on one graph. Every query is timed into `debug` so the UI can show it."""

    def __init__(self, name: str):
        self.name = name
        self.g = client().select_graph(name)
        self.debug: list[dict] = []
        self.later: list[tuple] = []  # AI wording jobs, run after the request (engine/gossip.polish_later)

    @classmethod
    def for_player(cls, player: str) -> "World":
        return cls(graph_name(player))

    def lock(self) -> threading.Lock:
        with _locks_guard:
            return _locks.setdefault(self.name, threading.Lock())

    def q(self, name: str, **params) -> list[dict]:
        t = time.perf_counter()
        res = self.g.query(QUERIES[name], params, timeout=QUERY_TIMEOUT_MS)
        self.debug.append({"name": name, "ms": round((time.perf_counter() - t) * 1000, 2)})
        cols = [h[1] for h in res.header]
        return [dict(zip(cols, row)) for row in res.result_set]

    def one(self, name: str, **params) -> dict:
        rows = self.q(name, **params)
        return rows[0] if rows else {}

    @classmethod
    def create(cls, player: str) -> "World":
        """A fresh village for this player: GRAPH.COPY of the template, then the player joins."""
        if not graph_exists(TEMPLATE):  # serverless hosts may skip the startup hook that seeds it
            from seed.seed import seed
            seed()
        w = cls.for_player(player)
        w.delete()
        # GRAPH.COPY forks the server; two at once fail with "could not fork", so serialise and retry
        with _copy_lock:
            for attempt in range(5):
                try:
                    client().select_graph(TEMPLATE).copy(w.name)
                    break
                except Exception as e:
                    if "fork" in str(e) and attempt < 4:
                        time.sleep(0.1 * (attempt + 1))
                        continue
                    # GRAPH.COPY unavailable (some hosted plans): build the village straight from the seed data
                    from seed.seed import seed
                    seed(w.name)
                    break
        w = cls.for_player(player)
        w.q("join", player=player, tick=w.one("world")["tick"], coins=START_COINS)
        return w

    def delete(self) -> None:
        if graph_exists(self.name):
            self.g.delete()
