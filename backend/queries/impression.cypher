// Q-IMPRESSION: consolidated memory, nightly
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
MERGE (v)-[:HAS_IMPRESSION]->(i:Impression {about: $player})
SET i.text = $text, i.updated_tick = $tick
MERGE (i)-[:ABOUT]->(p)
