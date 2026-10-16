"""test_fallback: with the AI disabled, every endpoint still answers; the wow moment plays over HTTP."""
from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)


def test_fallback_full_flow():
    s = c.post("/api/session", json={}).json()
    h = {"X-Player": s["player_id"]}
    assert s["state"]["tick"] == 6 and s["debug"]["queries"]
    assert c.post("/api/wait", json={"ticks": 4}, headers=h).status_code == 200
    assert c.post("/api/act", json={"action": "go", "place": "market"}, headers=h).status_code == 200
    r = c.post("/api/act", json={"action": "steal"}, headers=h).json()
    assert r["result"]["witnesses"] == ["Old Tomas"]
    assert c.post("/api/act", json={"action": "buy"}, headers=h).json()["result"]["price"] > 10
    talk = c.post("/api/talk", json={"villager": "tomas", "text": "Hello there"}, headers=h).json()
    assert talk["action"] == "raise_price" and talk["reply"]
    c.post("/api/wait", json={"ticks": 9}, headers=h)
    why = c.get("/api/why", params={"villager": "ilsa"}, headers=h).json()
    assert [x["id"] for x in why["chain"]] == ["ilsa", "bertha", "tomas"] and why["cypher"]
    assert c.get("/api/why", params={"villager": "anselm"}, headers=h).json()["chain"] == []
    # come back next session: the village remembers and has caught up to the morning
    back = c.post("/api/session", json={"player_id": s["player_id"]}).json()
    assert back["player_id"] == s["player_id"] and back["away"]["hours"] >= 6
    assert 7 <= back["state"]["hour"] < 23
    c.post("/api/act", json={"action": "go", "place": "gate"}, headers=h)
    assert c.post("/api/act", json={"action": "pass_gate"}, headers=h).json()["result"]["blocked"] is True
    inf = c.get("/api/spymaster/influence", headers=h).json()
    assert inf["pagerank"][0]["id"] == "bertha" and inf["communities"] and inf["brokers"]
    assert c.get("/api/spymaster/route", params={"start": "pip", "target": "ilsa"}, headers=h).json()["ids"] == ["pip", "bertha", "ilsa"]
    plan = c.post("/api/spymaster/ask", json={"question": "How do I fix things with Captain Ilsa?"}, headers=h).json()
    assert "Bertha" in plan["plan"]
    assert c.get("/api/graph", headers=h).json()["edges"]
    assert c.get("/api/graph", params={"view": "rumour"}, headers=h).json()["rumours"]
    assert c.get("/api/health").json()["db"] == "ok"
    assert c.post("/api/reset", headers=h).json()["state"]["tick"] == 6
    c.post("/api/reset", headers=h)
    from app.db import World
    World.for_player(s["player_id"]).delete()


def test_bad_input():
    assert c.get("/api/state", headers={"X-Player": "../../etc"}).status_code == 401
    s = c.post("/api/session", json={}).json()
    h = {"X-Player": s["player_id"]}
    assert c.post("/api/act", json={"action": "steal"}, headers=h).status_code == 400  # not at market
    assert c.post("/api/talk", json={"villager": "tomas", "text": "hi"}, headers=h).status_code == 400  # not here
    assert c.post("/api/talk", json={"villager": "bertha", "text": "x" * 301}, headers=h).status_code == 422
    from app.db import World
    World.for_player(s["player_id"]).delete()
