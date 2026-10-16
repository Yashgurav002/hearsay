"""PRD 15.1: memory, gossip, provenance and isolation, against real FalkorDB graphs."""
import demo_scenario
from app import game
from app.engine import gossip, memory


def rumours(w, player):
    return {r["id"]: r for r in w.q("rumour_graph", player=player)}


def test_witness(fresh):
    w, p = fresh("wit")
    gossip.advance(w, 5)  # tick 11, Tomas alone at the market
    game.act(w, p, "go", place="market")
    assert game.act(w, p, "steal")["witnesses"] == ["Old Tomas"]
    held = rumours(w, p)
    assert list(held) == ["theft-12-market:tomas"]
    assert held["theft-12-market:tomas"]["hops"] == 0 and held["theft-12-market:tomas"]["severity"] == 1


def test_nobody_watching(fresh):
    w, p = fresh("nobody")
    assert memory.witness(w, p, "chapel", "theft", 6) == []  # chapel is empty at 6am
    assert rumours(w, p) == {}
    assert w.one("opinion", villager="anselm", player=p)["terms"][0]["conf"] is None


def test_hop(demo):
    w, p = demo
    held = rumours(w, p)
    for listener, teller in [("pip", "tomas"), ("ilsa", "bertha")]:
        r, src = held[f"theft-11-market:{listener}"], held[f"theft-11-market:{teller}"]
        assert r["heard_from"] == [src["id"]] and r["hops"] == src["hops"] + 1
        assert src["severity"] <= r["severity"] <= min(5, src["severity"] + 1)
        assert r["confidence"] < src["confidence"]


def test_corroboration(demo):
    w, p = demo
    bertha = rumours(w, p)["theft-11-market:bertha"]
    assert sorted(bertha["heard_from"]) == ["theft-11-market:pip", "theft-11-market:tomas"]
    assert sum(1 for r in rumours(w, p).values() if r["holder"] == "bertha") == 1
    assert bertha["confidence"] > 0.1 * 1.01  # Pip alone gave ~0.10; Tomas pushed it up


def test_echo_guard(demo):
    w, p = demo
    # Bertha's version came (partly) from Pip, so Bertha has nothing new to tell Pip
    assert w.q("candidates", teller="bertha", listener="pip") == []
    assert w.q("candidates", teller="bertha", listener="tomas") == []  # Tomas saw it


def test_sceptic(fresh):
    w, p = fresh("sceptic")
    w.q("move_place", positions=[{"villager": "mira", "place": "well"}])
    memory.whisper(w, p, "mira", "well", "theft", 6)
    memory.whisper(w, p, "pip", "well", "theft", 6)
    assert memory.opinion(w, "pip", p) < 0
    assert memory.opinion(w, "mira", p) == 0  # one stranger's word isn't enough for Mira


def test_why_path(demo):
    w, p = demo
    from app.agents import villager
    why = villager.why(w, "ilsa", p)
    assert [c["id"] for c in why["chain"]] == ["ilsa", "bertha", "tomas"]
    assert why["what_happened"] == memory.story("theft", 1)
    assert why["explanation"] == "I heard it from Bertha; Bertha heard it from Old Tomas; Old Tomas saw it first-hand."


def test_isolation(fresh):
    w1, p1 = fresh("iso1")
    w2, p2 = fresh("iso2")
    memory.witness(w1, p1, "well", "theft", 6)
    assert rumours(w1, p1)
    assert w2.q("rumour_graph", player=p1) == [] and w2.q("rumour_graph", player=p2) == []
    assert w2.g.query("MATCH (e:Event) RETURN count(e)").result_set[0][0] == 0


def test_determinism(demo):
    w, p = demo
    w2 = demo_scenario.run("testdemo2", quiet=True, reseed=False)
    strip = lambda rs: [{**r, "id": r["id"]} for r in rs]  # ids are event:holder, player-independent
    assert strip(w2.q("rumour_graph", player="testdemo2")) == strip(w.q("rumour_graph", player=p))


def test_decay(fresh):
    w, p = fresh("decay")
    memory.witness(w, p, "well", "theft", 6)  # Bertha, Pip, Anselm see it at tick 6
    gossip.advance(w, 24 - 6)  # midnight tick 24: last_reinforced 6 > 24 - 24, so nothing fades yet
    conf = lambda: rumours(w, p)["theft-6-well:anselm"]["confidence"]
    assert conf() == 1.0
    gossip.advance(w, 24)  # midnight tick 48: unreinforced for 42 ticks
    assert abs(conf() - 0.97) < 1e-9


def test_notice_handoff(demo):
    w, p = demo
    memory.feel(w, "ilsa", p, -0.5)  # push Ilsa below -0.6
    while w.one("world")["tick"] % 24 != 12:
        gossip.advance(w, 1)
    gossip.advance(w, 1)  # Pip reaches the gate at 12 and reads the notice
    assert w.q("notices", villager="pip")
    assert w.one("notices", villager="ilsa")["kind"] == "wanted"
