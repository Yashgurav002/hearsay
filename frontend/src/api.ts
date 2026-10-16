export type Villager = { id: string; name: string; role: string; place: string | null; opinion: number }
export type Place = { id: string; name: string }
export type Notice = { id: string; kind: string; text: string; tick: number }
export type State = {
  tick: number; hour: number; day: number; place: string; coins: number
  villagers: Villager[]; places: Place[]; notices: Notice[]
}
export type Hop = {
  tick: number; place: string; teller: string; listener: string; event: string
  kind: 'hop' | 'corroborate'; severity: number; confidence: number; text: string | null; sentiment: number
}
export type QueryTiming = { name: string; ms: number }
export type Debug = { queries: QueryTiming[]; ms: number }
export type Belief = {
  id: string; story: string; severity: number; confidence: number; saw_it: boolean
  told_by: string[]; from_notice: boolean
}
export type ChainStep = { id: string; who: string; said: string; severity: number; hops: number; notice_by: string | null }
export type Why = {
  villager: string; chain: ChainStep[]; explanation: string; rumour_ids: string[]
  what_happened?: string; at_tick?: number; steps?: string[]; cypher?: string[]
}

const KEY = 'hearsay_player'
let player = ''
try { player = localStorage.getItem(KEY) || '' } catch { /* private mode: new village each visit */ }

export function getPlayer() { return player }
export function setPlayer(id: string) {
  player = id
  try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
}

export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T & { debug?: Debug }> {
  const res = await fetch(path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', 'X-Player': player },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || (typeof data.detail === 'string' ? data.detail : 'Something went wrong'))
  return data
}
