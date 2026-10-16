// Q-BELIEFS: what a villager believes about the player, and who told them
MATCH (v:Villager {id: $villager})-[h:HOLDS]->(r:Rumour)-[:ABOUT]->(:Player {id: $player})
WHERE h.confidence >= 0.1
MATCH (r)-[:ORIGIN]->(e:Event)
OPTIONAL MATCH (r)-[:HEARD_FROM]->(:Rumour)<-[:HOLDS]-(teller)
OPTIONAL MATCH (r)-[:FROM_NOTICE]->(n:Notice)
RETURN r.id AS id, e.id AS event, r.text AS story, r.severity AS severity, h.confidence AS confidence,
       r.sentiment AS sentiment, e.ladder AS ladder, r.hops = 0 AS saw_it, r.created_tick AS tick,
       collect(DISTINCT teller.name) AS told_by, n IS NOT NULL AS from_notice
ORDER BY confidence DESC, id
