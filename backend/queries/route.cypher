// Q-ROUTE: a rumour flows A -> B when B trusts A, so the path runs against TRUSTS
MATCH (s:Villager {id: $start}), (t:Villager {id: $target})
WITH shortestPath((s)<-[:TRUSTS*1..6]-(t)) AS p
RETURN [n IN nodes(p) | n.name] AS route, [n IN nodes(p) | n.id] AS ids, length(p) AS hops
