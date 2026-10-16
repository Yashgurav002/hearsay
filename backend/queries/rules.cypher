// Q-RULES: procedural memory
MATCH (:Villager {id: $villager})-[:FOLLOWS]->(rule:Rule)
RETURN rule.id AS id, rule.condition AS condition, rule.action AS action, rule.threshold AS threshold
ORDER BY id
