// Q-CORROBORATE: B hears the same story from someone else; c = 1 - (1 - c_old)(1 - c_new)
MATCH (b:Villager {id: $listener})-[h:HOLDS]->(mine:Rumour {id: $mine}),
      (src:Rumour {id: $src})
MERGE (mine)-[hf:HEARD_FROM]->(src)
ON CREATE SET hf.tick = $tick, hf.place = $place
SET h.confidence = 1 - (1 - h.confidence) * (1 - $incoming),
    h.last_reinforced = $tick
RETURN h.confidence AS confidence
