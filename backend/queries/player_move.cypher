// Q-GO: the player walks somewhere
MATCH (p:Player {id: $player})-[a:AT]->(:Place)
DELETE a
WITH p
MATCH (pl:Place {id: $place})
CREATE (p)-[:AT]->(pl)
