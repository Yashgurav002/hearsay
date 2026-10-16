// Q-WORLD: clock, seed and the player's position
MATCH (w:World)
OPTIONAL MATCH (p:Player)-[:AT]->(pl:Place)
RETURN w.tick AS tick, w.seed AS seed, p.id AS player, pl.id AS place, p.coins AS coins
