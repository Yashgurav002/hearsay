// Q-CANDIDATES: what A is likely to tell B. B's existing version of the same event (mine) blocks it when:
// B saw it first-hand (hops = 0), B already heard this exact version from A, or A's version came
// from B in the first place (echo-chamber guard).
// (Filters live in WHERE: an OPTIONAL MATCH var-length path to a null node duplicates rows in FalkorDB.)
MATCH (a:Villager {id: $teller})-[h:HOLDS]->(r:Rumour)-[:ORIGIN]->(e:Event)
WHERE h.confidence >= 0.2 AND e.kind <> 'conversation'
OPTIONAL MATCH (b:Villager {id: $listener})-[:HOLDS]->(mine:Rumour)-[:ORIGIN]->(e)
WITH r, h, e, mine
WHERE mine IS NULL
   OR (mine.hops > 0 AND NOT (mine)-[:HEARD_FROM]->(r) AND NOT (r)-[:HEARD_FROM*1..6]->(mine))
RETURN r.id AS rumour, r.severity AS severity, r.hops AS hops, h.confidence AS conf,
       e.id AS event, e.ladder AS ladder, e.sentiment AS sentiment, mine.id AS listener_version
ORDER BY e.juiciness * h.confidence DESC, rumour
LIMIT 2
