// Q-WARN: who listens to me most (whom should I tell)
MATCH (me:Villager {id: $villager})<-[t:TRUSTS]-(listener:Villager)
RETURN listener.id AS id, listener.name AS name, t.weight AS trust
ORDER BY trust DESC
LIMIT 3
