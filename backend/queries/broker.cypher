// Q-BROKER: who connects groups (betweenness centrality)
CALL algo.betweenness({nodeLabels: ['Villager'], relationshipTypes: ['TRUSTS']})
YIELD node, score
RETURN node.id AS id, node.name AS villager, score
ORDER BY score DESC
