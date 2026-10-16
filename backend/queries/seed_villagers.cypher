// Q-SEED (2/4): villagers; schedule is a JSON string [[from_hour, to_hour, place], ...]
UNWIND $villagers AS v
CREATE (:Villager {id: v.id, name: v.name, role: v.role, gossip: v.gossip,
                   exaggeration: v.exaggeration, persona: v.persona, schedule: v.schedule})
