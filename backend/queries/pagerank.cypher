// Q-PAGERANK: TRUSTS points from listener to the person believed, so rank flows to the most-believed
CALL algo.pageRank('Villager', 'TRUSTS') YIELD node, score
RETURN node.id AS id, node.name AS villager, score
ORDER BY score DESC
