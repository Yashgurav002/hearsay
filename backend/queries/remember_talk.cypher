// Q-REMEMBER-TALK: store a conversation as an episodic event
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
CREATE (c:Event {id: $id, kind: 'conversation', tick: $tick, juiciness: 0.1,
                 sentiment: $sentiment, base_text: $summary})
CREATE (c)-[:SPOKE_WITH]->(v)
CREATE (c)-[:ABOUT]->(p)
