import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / "backend"), str(ROOT / "scripts")]
os.environ["LLM_DISABLED"] = "true"

import pytest  # noqa: E402

from app.db import World, client  # noqa: E402
from seed.seed import seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def template():
    seed()
    yield
    for g in client().list_graphs():
        if g.startswith("hearsay_test"):
            client().select_graph(g).delete()


@pytest.fixture
def fresh():
    """A new empty world per call: fresh('a') -> (World, player id)."""
    def make(suffix="a"):
        player = f"test{suffix}"
        return World.create(player), player
    return make


@pytest.fixture(scope="session")
def demo(template):
    """The scripted wow moment, played once: theft at tick 11, world at tick 22."""
    import demo_scenario
    return demo_scenario.run("testdemo", quiet=True, reseed=False), "testdemo"
