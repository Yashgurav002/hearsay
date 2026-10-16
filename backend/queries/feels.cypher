// Q-FEELS: update direct feeling (gifts, rudeness, kindness), clamped to -1..1
MATCH (v:Villager {id: $villager}), (p:Player {id: $player})
MERGE (v)-[f:FEELS]->(p)
ON CREATE SET f.affinity = 0
SET f.affinity = CASE
    WHEN f.affinity + $delta > 1 THEN 1
    WHEN f.affinity + $delta < -1 THEN -1
    ELSE f.affinity + $delta END
RETURN f.affinity AS affinity
