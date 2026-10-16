// Q-IMPRESSION-GET: read the consolidated view
MATCH (:Villager {id: $villager})-[:HAS_IMPRESSION]->(i:Impression {about: $player})
RETURN i.text AS text, i.updated_tick AS tick
