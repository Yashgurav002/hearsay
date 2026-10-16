// Q-SEED (1/4): world clock + places
CREATE (:World {tick: $tick, version: 1, seed: $seed})
WITH 1 AS x
UNWIND $places AS pl
CREATE (:Place {id: pl.id, name: pl.name})
