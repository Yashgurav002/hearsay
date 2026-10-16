// Q-COINS: the player's purse
MATCH (p:Player {id: $player})
SET p.coins = coalesce(p.coins, 0) + $delta
RETURN p.coins AS coins
