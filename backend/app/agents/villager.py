"""Villager agent (PRD 8.1): perceive (graph) -> decide (code) -> speak (AI or template) -> remember (graph)."""
import re
import uuid

from .. import llm
from ..db import World
from ..engine import memory
from ..game import GameError, here

RUDE = re.compile(r"\b(idiot|stupid|shut up|hate|liar|fool|ugly|thief|damn)\b", re.I)
KIND = re.compile(r"\b(thank|thanks|please|sorry|kind|friend|lovely|bless)\b", re.I)


def villager_row(w: World, vid: str) -> dict:
    return next(v for v in w.q("villagers") if v["id"] == vid)


def perceive(w: World, vid: str, player: str) -> dict:
    rules = memory.actions_of(w, vid)
    op = memory.opinion(w, vid, player, rules)
    return {
        "beliefs": w.q("beliefs", villager=vid, player=player),
        "rules": rules,
        "opinion": op,
        "feel": w.one("opinion", villager=vid, player=player)["feel"],
        "impression": w.one("impression_get", villager=vid, player=player).get("text"),
        "history": w.q("history", villager=vid, player=player),
        "notices": w.q("notices", villager=vid),
    }


def decide(ctx: dict) -> str:
    acts = memory.triggered(ctx["rules"], ctx["opinion"])
    if "block_gate" in acts or "refuse" in acts:
        return "refuse"
    if "scale_price" in acts:
        return "raise_price" if ctx["opinion"] < -0.05 else "discount" if ctx["opinion"] > 0.05 else "talk"
    if "share_gossip" in acts and ctx["beliefs"]:
        return "share_gossip"
    return "talk"


def source_phrase(b: dict) -> str:
    if b["saw_it"]:
        return "saw it themselves"
    if b["from_notice"]:
        return "read it on the wanted notice at the gate"
    return "heard it from " + " and ".join(b["told_by"])


def facts(ctx: dict) -> str:
    if not ctx["beliefs"]:
        return "- Nothing. You have heard nothing about them."
    return "\n".join(f"- {memory.story(b['ladder'], b['severity'])} (you {source_phrase(b)}; "
                     f"confidence {b['confidence']:.2f})" for b in ctx["beliefs"])


def template_reply(v: dict, action: str, ctx: dict) -> str:
    top = ctx["beliefs"][0] if ctx["beliefs"] else None
    claim = ""
    if top:
        what = memory.LADDERS[top["ladder"]][top["severity"] - 1]
        who = "I saw it myself" if top["saw_it"] else (
            "the notice at the gate says so" if top["from_notice"] else f"{top['told_by'][0]} told me")
        claim = f"They say you {what}, {who}. " if not top["saw_it"] else f"You {what}, {who}. "
    return {
        "refuse": f"Hmph. {claim}You're not welcome here.",
        "raise_price": f"{claim}Prices just went up for you.",
        "discount": f"{claim}For you, a little discount.",
        "share_gossip": f"Psst! {claim}" if claim else "Nothing much to tell today.",
        "talk": f"{claim}What do you want, traveller?" if claim and top["sentiment"] < 0 else
                f"{claim}Good day to you, traveller." if claim else "Good day, traveller. I don't believe we've met.",
    }[action].strip()


def talk(w: World, vid: str, player: str, text: str) -> dict:
    tick, _, present = here(w)
    if vid not in present:
        raise GameError("they aren't here")
    v = villager_row(w, vid)
    ctx = perceive(w, vid, player)
    action = decide(ctx)
    history = "\n".join(f"- {h['line']}" for h in reversed(ctx["history"])) or "- (first meeting)"
    prompt = (f"You are {v['name']}, the {v['role']} of a small village. Personality: {v['persona']}.\n"
              f"You are speaking to a traveller. You have DECIDED to: {action}. Do not change this decision.\n"
              f"What you know about the traveller (and who told you):\n{facts(ctx)}\n"
              f"Your own experience with them: feeling {ctx['feel']:+.2f}. Your overall impression: {ctx['impression'] or 'none yet'}.\n"
              f"Earlier conversations:\n{history}\n"
              f"The traveller says: \"{text}\"\n"
              f"Rules:\n- Use ONLY the facts above. Never mention events or people not listed.\n"
              f"- If you heard something second-hand, say who told you, in your own words.\n"
              f"- Speak in character, 1-2 short sentences, no narration.")
    reply = llm.chat(prompt, template_reply(v, action, ctx), debug=w.debug)
    delta = -0.15 if RUDE.search(text) else 0.1 if KIND.search(text) else 0.0
    if delta:
        memory.feel(w, vid, player, delta)
    w.q("remember_talk", villager=vid, player=player, id=f"talk-{uuid.uuid4().hex[:10]}", tick=tick,
        sentiment=delta, summary=f'Traveller: "{text[:160]}" / {v["name"]}: "{reply[:200]}"')
    return {"villager": vid, "reply": reply, "action": action, "opinion": ctx["opinion"],
            "beliefs": ctx["beliefs"], "impression": ctx["impression"]}


def why(w: World, vid: str, player: str) -> dict:
    v = villager_row(w, vid)
    path = w.one("why", villager=vid, player=player)
    if not path:
        return {"villager": vid, "chain": [], "explanation": f"{v['name']} hasn't heard anything about you.",
                "rumour_ids": []}
    chain = w.q("why_holders", rumour_ids=path["rumour_ids"])
    steps = []
    for i, c in enumerate(chain):
        if c["notice_by"]:
            steps.append(f"{c['who']} read it on the wanted notice {c['notice_by']} posted at the gate")
        elif c["hops"] == 0:
            steps.append(f"{c['who']} saw it first-hand" if c["id"] != player else "you started that story yourself")
        elif i + 1 < len(chain):
            steps.append(f"{c['who']} heard it from {chain[i + 1]['who']}")
    fallback = ("I saw it with my own eyes." if len(chain) == 1 and chain[0]["hops"] == 0
                else "; ".join(steps).replace(v["name"] + " heard", "I heard", 1) + ".")
    fallback = fallback[0].upper() + fallback[1:]
    prompt = (f"You are {v['name']}, the {v['role']}. Personality: {v['persona']}. The traveller asks why you think "
              f"what you think about them. Explain in 1-2 sentences, in character, exactly this chain and nothing else: "
              f"{'; '.join(steps)}. What you believe: \"{chain[0]['said']}\".")
    return {"villager": vid, "what_happened": path["what_happened"], "at_tick": path["at_tick"],
            "chain": chain, "rumour_ids": path["rumour_ids"], "steps": steps,
            "explanation": llm.chat(prompt, fallback, debug=w.debug)}
