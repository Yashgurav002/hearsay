// Q-NOTICE-READ: villagers at the gate (other than the poster) read new notices
MATCH (v:Villager)-[:AT]->(:Place {id: 'gate'})<-[:AT]-(n:Notice)-[:ABOUT]->(p:Player)
WHERE NOT (v)-[:POSTED]->(n)
MATCH (n)-[:ORIGIN]->(e:Event)
OPTIONAL MATCH (v)-[seen:READ]->(n)
WITH v, n, p, e, seen
WHERE seen IS NULL
CREATE (v)-[:READ {tick: $tick}]->(n)
RETURN v.id AS reader, n.id AS notice, p.id AS player, e.ladder AS ladder
