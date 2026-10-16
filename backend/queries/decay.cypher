// Q-DECAY: forgetting, nightly
MATCH (:Villager)-[h:HOLDS]->(:Rumour)
WHERE h.last_reinforced <= $tick - 24 AND h.confidence >= 0.1
SET h.confidence = h.confidence * 0.97
RETURN count(h) AS faded
