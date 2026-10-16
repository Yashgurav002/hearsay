// Q-NOTICE-POST: the guard shares state with everyone (handoff)
MATCH (g:Villager {id: 'ilsa'}), (p:Player {id: $player}),
      (gate:Place {id: 'gate'}), (e:Event {id: $event})
MERGE (n:Notice {id: 'wanted:' + $player})
ON CREATE SET n.kind = 'wanted', n.tick = $tick, n.text = $text
MERGE (g)-[:POSTED]->(n)
MERGE (n)-[:AT]->(gate)
MERGE (n)-[:ABOUT]->(p)
MERGE (n)-[:ORIGIN]->(e)
RETURN n.id AS id
