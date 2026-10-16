// Q-TRUSTED: whom does this villager believe most (spymaster: who to work through)
MATCH (v:Villager {id: $villager})-[t:TRUSTS]->(b:Villager)
RETURN b.id AS id, b.name AS name, t.weight AS trust
ORDER BY trust DESC
