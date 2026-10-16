// Q-OPINION: inputs for one number. Python sums sentiment x confidence + feeling, applying
// the villager's rules (sceptic drops single-source rumours, priest ignores gossip).
// sources = how many different people told them this (Q-SOURCES, used by the sceptic).
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
OPTIONAL MATCH (v)-[f:FEELS]->(p)
OPTIONAL MATCH (v)-[h:HOLDS]->(r:Rumour)-[:ABOUT]->(p)
WHERE h.confidence >= 0.1
OPTIONAL MATCH (r)-[:HEARD_FROM]->(:Rumour)<-[:HOLDS]-(teller:Villager)
WITH f, r, h, count(DISTINCT teller) AS sources
RETURN coalesce(f.affinity, 0) AS feel,
       collect({sentiment: r.sentiment, conf: h.confidence, hops: r.hops, sources: sources}) AS terms
