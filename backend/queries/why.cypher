// Q-WHY: follow the strongest belief back along HEARD_FROM to the version of someone who
// saw it (hops = 0) or read it on a notice. *0..6 covers "I saw it myself".
MATCH (v:Villager {id: $villager})-[h:HOLDS]->(r:Rumour)-[:ABOUT]->(:Player {id: $player})
WHERE h.confidence >= 0.1
WITH r, h ORDER BY h.confidence DESC, r.id LIMIT 1
MATCH path = (r)-[:HEARD_FROM*0..6]->(o:Rumour)-[:ORIGIN]->(e:Event)
WHERE o.hops = 0 OR (o)-[:FROM_NOTICE]->(:Notice)
WITH path, e ORDER BY length(path) ASC LIMIT 1
RETURN [n IN nodes(path) WHERE n:Rumour | n.id] AS rumour_ids, e.base_text AS what_happened,
       e.tick AS at_tick, e.kind AS kind
