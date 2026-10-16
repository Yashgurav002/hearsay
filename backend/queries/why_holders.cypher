// Q-WHY (2/2): who held each version on the path
UNWIND $rumour_ids AS rid
MATCH (holder)-[:HOLDS]->(ver:Rumour {id: rid})
OPTIONAL MATCH (ver)-[:FROM_NOTICE]->(:Notice)<-[:POSTED]-(poster:Villager)
RETURN holder.id AS id, holder.name AS who, ver.text AS said, ver.severity AS severity,
       ver.hops AS hops, poster.name AS notice_by
ORDER BY hops DESC
