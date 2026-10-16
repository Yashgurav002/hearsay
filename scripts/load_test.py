"""Many player worlds in one FalkorDB, ticking in parallel (PRD 15.2).
Usage: python scripts/load_test.py 10 100   -> prints a markdown table of p50/p95 latencies."""
import os
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
os.environ["LLM_DISABLED"] = "true"
from app import game  # noqa: E402
from app.db import TEMPLATE, World, client, graph_exists  # noqa: E402
from app.engine import gossip, memory  # noqa: E402


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(len(xs) * p))]


def one_world(i: int) -> dict:
    player = f"load{i:06d}"
    w = World.create(player)
    gossip.advance(w, 5)
    game.act(w, player, "go", place="market")
    game.act(w, player, "steal")
    t = time.perf_counter()
    gossip.advance(w, 10)
    tick_ms = (time.perf_counter() - t) * 1000 / 10
    w.debug.clear()
    for v in game.NAMES:
        w.q("beliefs", villager=v, player=player)
        memory.opinion(w, v, player)
    reads = [q["ms"] for q in w.debug]
    return {"tick_ms": tick_ms, "reads": reads}


def run(n: int, workers: int = 16) -> dict:
    t = time.perf_counter()
    with ThreadPoolExecutor(workers) as pool:
        results = list(pool.map(one_world, range(n)))
    alive = sum(g.startswith("hearsay_load") for g in client().list_graphs())
    for i in range(n):
        World.for_player(f"load{i:06d}").delete()
    reads = [r for res in results for r in res["reads"]]
    ticks = [res["tick_ms"] for res in results]
    return {"worlds": n, "alive": alive, "wall_s": round(time.perf_counter() - t, 1),
            "read_p50": statistics.median(reads), "read_p95": pct(reads, 0.95),
            "tick_p50": statistics.median(ticks), "tick_p95": pct(ticks, 0.95)}


if __name__ == "__main__":
    if not graph_exists(TEMPLATE):
        from seed.seed import seed
        seed()
    print("| worlds (all alive at end) | wall time (s) | Q-BELIEFS/Q-OPINION p50 (ms) | p95 (ms) | full tick p50 (ms) | p95 (ms) |")
    print("|---|---|---|---|---|---|")
    for n in map(int, sys.argv[1:] or ["10", "100"]):
        r = run(n)
        print(f"| {r['worlds']} ({r['alive']}) | {r['wall_s']} | {r['read_p50']:.2f} | {r['read_p95']:.2f} | {r['tick_p50']:.1f} | {r['tick_p95']:.1f} |")
    leftover = [g for g in client().list_graphs() if g.startswith("hearsay_load")]
    assert not leftover, leftover
