// Q-TRUST-VIEW: edges for the gossip graph panel
MATCH (a:Villager)-[t:TRUSTS]->(b:Villager)
RETURN a.id AS source, b.id AS target, t.weight AS weight
