// Q-NOTICES: shared state a villager has seen or posted
MATCH (:Villager {id: $villager})-[:READ|POSTED]->(n:Notice)
RETURN n.id AS id, n.kind AS kind, n.text AS text, n.tick AS tick
