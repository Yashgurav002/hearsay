// Q-JOIN: add the player to their world, standing at the well
MERGE (p:Player {id: $player})
ON CREATE SET p.name = 'the traveller', p.created_tick = $tick
WITH p
MATCH (pl:Place {id: 'well'})
MERGE (p)-[:AT]->(pl)
