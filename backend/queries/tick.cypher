// Q-TICK: advance the clock by one hour
MATCH (w:World)
SET w.tick = w.tick + 1
RETURN w.tick AS tick, w.seed AS seed
