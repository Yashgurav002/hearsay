// Q-SEED (4/4): procedural memory
UNWIND $rules AS r
MATCH (v:Villager {id: r.villager})
CREATE (v)-[:FOLLOWS]->(:Rule {id: r.id, role: r.role, condition: r.condition,
                               action: r.action, threshold: r.threshold})
