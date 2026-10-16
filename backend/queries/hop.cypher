// Q-HOP: B now believes their own version, linked to the teller's version and the real event
MATCH (b:Villager {id: $listener}), (src:Rumour {id: $src}),
      (e:Event {id: $event})-[:ABOUT]->(subject)
CREATE (b)-[:HOLDS {confidence: $conf, since: $tick, last_reinforced: $tick}]->
       (r:Rumour {id: $id, text: $text, severity: $severity, sentiment: $sentiment,
                  hops: $hops, created_tick: $tick})
CREATE (r)-[:HEARD_FROM {tick: $tick, place: $place}]->(src)
CREATE (r)-[:ORIGIN]->(e)
CREATE (r)-[:ABOUT]->(subject)
RETURN r.id AS id
