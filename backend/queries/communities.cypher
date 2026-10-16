// Q-COMMUNITIES: cliques = groups joined by strong trust (CLOSE = TRUSTS with weight >= 0.6).
// Weakly connected components; label propagation oscillates on two-person pairs like Mira <-> Anselm.
CALL algo.WCC({nodeLabels: ['Villager'], relationshipTypes: ['CLOSE']})
YIELD node, componentId
RETURN componentId AS communityId, collect(node.name) AS members, collect(node.id) AS ids
ORDER BY size(members) DESC
