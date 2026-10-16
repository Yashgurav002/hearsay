// Q-STATE: where everyone is
MATCH (v:Villager)
OPTIONAL MATCH (v)-[:AT]->(pl:Place)
RETURN v.id AS id, v.name AS name, v.role AS role, pl.id AS place
ORDER BY id
