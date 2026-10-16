// Q-SEED (3/4): directed trust, (listener)-[:TRUSTS]->(person they believe)
UNWIND $trust AS t
MATCH (a:Villager {id: t.from}), (b:Villager {id: t.to})
CREATE (a)-[:TRUSTS {weight: t.weight}]->(b)
