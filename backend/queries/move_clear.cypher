// Q-MOVE (1/2): everyone leaves where they were
MATCH (v:Villager)-[a:AT]->(:Place) DELETE a
