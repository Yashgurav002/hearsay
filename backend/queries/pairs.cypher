// Q-PAIRS: A and B are in the same place and B trusts A, so A can tell B things
MATCH (a:Villager)-[:AT]->(pl:Place)<-[:AT]-(b:Villager)
MATCH (b)-[t:TRUSTS]->(a)
RETURN a.id AS teller, b.id AS listener, t.weight AS trust, pl.id AS place
ORDER BY teller, listener
