// Q-NOTICE-RUMOUR: a reader who hadn't heard the story now believes it (severity 3, confidence 0.6)
MATCH (v:Villager {id: $reader}), (n:Notice {id: $notice})-[:ORIGIN]->(e:Event)-[:ABOUT]->(p)
OPTIONAL MATCH (v)-[:HOLDS]->(mine:Rumour)-[:ORIGIN]->(e)
WITH v, n, e, p, mine
WHERE mine IS NULL
CREATE (v)-[:HOLDS {confidence: 0.6, since: $tick, last_reinforced: $tick}]->
       (r:Rumour {id: e.id + ':' + v.id, text: $text, severity: 3, sentiment: $sentiment,
                  hops: 1, created_tick: $tick})
CREATE (r)-[:FROM_NOTICE]->(n)
CREATE (r)-[:ORIGIN]->(e)
CREATE (r)-[:ABOUT]->(p)
RETURN r.id AS id
