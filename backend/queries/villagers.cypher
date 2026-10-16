// Q-VILLAGERS: agent parameters, read every tick
MATCH (v:Villager)
OPTIONAL MATCH (v)-[:FOLLOWS]->(r:Rule)
RETURN v.id AS id, v.name AS name, v.role AS role, v.gossip AS gossip,
       v.exaggeration AS exaggeration, v.persona AS persona, v.schedule AS schedule,
       collect(r.action) AS actions
ORDER BY id
