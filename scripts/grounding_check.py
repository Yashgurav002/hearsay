"""Grounding: over N scripted conversations, does any reply name a villager who isn't in that
villager's graph context? Run directly to test the real model (needs LLM_API_KEY); the pytest
version runs it with templates."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from app import game  # noqa: E402
from app.agents import villager as agent  # noqa: E402
from app.engine import gossip  # noqa: E402

NAMES = {vid: name.split()[-1] for vid, name in game.NAMES.items()}  # Tomas, Bertha, Ilsa, ...
LINES = ["Hello!", "What have you heard about me?", "Any news today?", "Why are you looking at me like that?",
         "Can I trust you?", "Who told you that?", "I'm sorry for any trouble.", "Nice weather."]


def run(n: int = 50, player: str = "ground01") -> dict:
    import demo_scenario
    w = demo_scenario.run(player, quiet=True, reseed=False)
    talks, bad = 0, []
    while talks < n:
        _, place, present = game.here(w)
        for vid in present:
            ctx = agent.perceive(w, vid, player)
            context = agent.facts(ctx) + " ".join(n for b in ctx["beliefs"] for n in b["told_by"]) + game.NAMES[vid]
            allowed = {short for v, short in NAMES.items() if short in context}
            reply = agent.talk(w, vid, player, LINES[talks % len(LINES)])["reply"]
            leaked = [short for short in NAMES.values() if short in reply and short not in allowed]
            if leaked:
                bad.append({"villager": vid, "reply": reply, "leaked": leaked})
            talks += 1
        gossip.advance(w, 1)
    w.delete()
    return {"conversations": talks, "invented": len(bad), "rate": len(bad) / talks, "examples": bad[:5]}


if __name__ == "__main__":
    from app import llm
    print("LLM:", "on, " + llm.MODEL if llm.enabled() else "off (templates)")
    print(run(int(sys.argv[1]) if len(sys.argv) > 1 else 50))
