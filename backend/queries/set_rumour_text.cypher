// Q-POLISH: swap a rumour's template wording for the AI phrasing once it arrives
MATCH (r:Rumour {id: $id})
SET r.text = $text
