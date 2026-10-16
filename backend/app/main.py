"""FastAPI routes (PRD section 12). The player id travels in the X-Player header; it names their graph."""
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import game, llm
from .agents import spymaster
from .agents import villager as agent
from .db import PLAYER_ID, QUERIES, TEMPLATE, World, client, graph_exists, graph_name
from .engine import gossip, memory

@asynccontextmanager
async def lifespan(_: FastAPI):
    if not graph_exists(TEMPLATE):
        from seed.seed import seed
        seed()
    yield


app = FastAPI(title="Hearsay", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(game.GameError)
def game_error(_: Request, e: game.GameError):
    return JSONResponse({"error": str(e)}, status_code=400)


def world(player: str | None) -> World:
    if not player or not PLAYER_ID.match(player) or not graph_exists(graph_name(player)):
        raise HTTPException(401, "no session; POST /api/session first")
    return World.for_player(player)


def respond(w: World, t0: float, **body) -> dict:
    return {**body, "debug": {"queries": w.debug, "ms": round((time.perf_counter() - t0) * 1000, 1)}}


def state(w: World, player: str) -> dict:
    st = w.one("world")
    villagers = w.q("state")
    rules = {v["id"]: [{"action": a} for a in v["actions"]] for v in w.q("villagers")}  # one query for everyone's rules
    for v in villagers:
        v["opinion"] = memory.opinion(w, v["id"], player, rules[v["id"]])
    return {"tick": st["tick"], "hour": st["tick"] % 24, "day": st["tick"] // 24 + 1, "place": st["place"],
            "coins": st["coins"],
            "villagers": villagers, "places": [{"id": k, "name": n} for k, n in game.PLACES.items()],
            "notices": w.q("notices", villager="ilsa")}


class SessionIn(BaseModel):
    player_id: str | None = None


@app.post("/api/session")
def session(body: SessionIn):
    t0 = time.perf_counter()
    player, away = body.player_id, None
    if player and PLAYER_ID.match(player) and graph_exists(graph_name(player)):
        w = World.for_player(player)
        with w.lock():
            n = gossip.catch_up_ticks(w.one("world")["tick"])
            away = {"hours": n, "hops": gossip.advance(w, n)}
    else:
        player = uuid.uuid4().hex[:12]
        w = World.create(player)
    with w.lock():
        return respond(w, t0, player_id=player, away=away, state=state(w, player))


@app.get("/api/state")
def get_state(x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    with w.lock():
        return respond(w, t0, state=state(w, x_player))


class ActIn(BaseModel):
    action: str
    place: str | None = None
    target: str | None = None
    ladder: str | None = None


@app.post("/api/act")
def act(body: ActIn, x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    with w.lock():
        result = game.act(w, x_player, body.action, body.place, body.target, body.ladder)
        return respond(w, t0, result=result, state=state(w, x_player))


class TalkIn(BaseModel):
    villager: str
    text: str = Field(max_length=300)


@app.post("/api/talk")
def talk(body: TalkIn, x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    with w.lock():
        return respond(w, t0, **agent.talk(w, body.villager, x_player, body.text))


@app.get("/api/why")
def why(villager: str, x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    if villager not in game.NAMES:
        raise HTTPException(400, "unknown villager")
    with w.lock():
        return respond(w, t0, **agent.why(w, villager, x_player), cypher=[QUERIES["why"], QUERIES["why_holders"]])



class WaitIn(BaseModel):
    ticks: int = Field(1, ge=1, le=24)


@app.post("/api/wait")
def wait(body: WaitIn, x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    with w.lock():
        return respond(w, t0, hops=gossip.advance(w, body.ticks), state=state(w, x_player))


@app.get("/api/spymaster/influence")
def influence(x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    return respond(w, t0, **spymaster.influence(w))


@app.get("/api/spymaster/route")
def route(start: str, target: str, x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    return respond(w, t0, **spymaster.route(w, start, target))


class AskIn(BaseModel):
    question: str = Field(max_length=300)


@app.post("/api/spymaster/ask")
def ask(body: AskIn, x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    with w.lock():
        return respond(w, t0, **spymaster.ask(w, x_player, body.question))


@app.get("/api/graph")
def graph(view: str = "trust", x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    if view == "rumour":
        return respond(w, t0, rumours=w.q("rumour_graph", player=x_player))
    return respond(w, t0, nodes=w.q("state"), edges=w.q("trust_view"))


@app.post("/api/reset")
def reset(x_player: str = Header(None)):
    t0, w = time.perf_counter(), world(x_player)
    with w.lock():
        w = World.create(x_player)
        return respond(w, t0, state=state(w, x_player))


@app.get("/api/queries")
def queries():
    return QUERIES


@app.get("/api/health")
def health():
    try:
        client().list_graphs()
        db = "ok"
    except Exception as e:
        db = f"error: {type(e).__name__}"
    return {"db": db, "llm": "on" if llm.enabled() else "off (templates)", "llm_model": llm.MODEL,
            "llm_last_error": llm.last_error}


DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
