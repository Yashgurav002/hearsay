// Q-SEED (5/5): strong trust (>= 0.6) as its own edge type, so community detection finds cliques
MATCH (a:Villager)-[t:TRUSTS]->(b:Villager)
WHERE t.weight >= 0.6
CREATE (a)-[:CLOSE {weight: t.weight}]->(b)
