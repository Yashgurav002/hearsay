// Q-MOVE (2/2): place villagers per schedule (nobody is placed at night)
UNWIND $positions AS pos
MATCH (v:Villager {id: pos.villager}), (pl:Place {id: pos.place})
CREATE (v)-[:AT]->(pl)
