// Q-WITNESS: the player does something; whoever is there sees it (hop-0, severity-1 rumour)
MATCH (p:Player {id: $player}), (pl:Place {id: $place})
CREATE (e:Event {id: $event, kind: $kind, ladder: $ladder, tick: $tick, juiciness: $juice,
                 sentiment: $sentiment, base_text: $text})
CREATE (e)-[:AT]->(pl)
CREATE (e)-[:ABOUT]->(p)
WITH e, p, pl
MATCH (w:Villager)-[:AT]->(pl)
CREATE (w)-[:WITNESSED {tick: $tick}]->(e)
CREATE (w)-[:HOLDS {confidence: 1.0, since: $tick, last_reinforced: $tick}]->
       (r:Rumour {id: e.id + ':' + w.id, text: e.base_text, severity: 1,
                  sentiment: $rumour_sentiment, hops: 0, created_tick: $tick})
CREATE (r)-[:ORIGIN]->(e)
CREATE (r)-[:ABOUT]->(p)
RETURN collect(w.name) AS witnesses
