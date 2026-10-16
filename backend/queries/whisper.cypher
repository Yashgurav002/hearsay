// Q-WHISPER: the player plants a story with one villager. The player holds the
// hop-0 source version, so "Why?" can say the traveller started it.
MATCH (p:Player {id: $player}), (b:Villager {id: $listener}), (pl:Place {id: $place})
CREATE (e:Event {id: $event, kind: 'whisper', ladder: $ladder, tick: $tick, juiciness: $juice,
                 sentiment: $sentiment, base_text: $text})
CREATE (e)-[:AT]->(pl)
CREATE (e)-[:ABOUT]->(p)
CREATE (p)-[:HOLDS {confidence: 1.0, since: $tick, last_reinforced: $tick}]->
       (src:Rumour {id: e.id + ':' + p.id, text: e.base_text, severity: 1,
                    sentiment: $rumour_sentiment, hops: 0, created_tick: $tick})
CREATE (src)-[:ORIGIN]->(e)
CREATE (src)-[:ABOUT]->(p)
CREATE (b)-[:HOLDS {confidence: $conf, since: $tick, last_reinforced: $tick}]->
       (r:Rumour {id: e.id + ':' + b.id, text: e.base_text, severity: 1,
                  sentiment: $rumour_sentiment, hops: 1, created_tick: $tick})
CREATE (r)-[:HEARD_FROM {tick: $tick, place: $place}]->(src)
CREATE (r)-[:ORIGIN]->(e)
CREATE (r)-[:ABOUT]->(p)
RETURN r.id AS id
