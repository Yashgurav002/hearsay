// Q-HISTORY: persistent conversation history
MATCH (c:Event {kind: 'conversation'})-[:SPOKE_WITH]->(:Villager {id: $villager}),
      (c)-[:ABOUT]->(:Player {id: $player})
RETURN c.base_text AS line, c.tick AS tick
ORDER BY tick DESC
LIMIT 6
