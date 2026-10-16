// Q-RUMOUR-GRAPH: every version of every story about the player, who holds it, and where it came from
MATCH (holder)-[h:HOLDS]->(r:Rumour)-[:ABOUT]->(:Player {id: $player})
OPTIONAL MATCH (r)-[:HEARD_FROM]->(src:Rumour)
RETURN r.id AS id, holder.id AS holder, r.text AS text, r.severity AS severity, r.hops AS hops,
       r.sentiment AS sentiment, h.confidence AS confidence, collect(src.id) AS heard_from
ORDER BY id
