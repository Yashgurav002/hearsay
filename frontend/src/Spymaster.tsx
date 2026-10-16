import { useEffect, useState } from 'react'
import { api, type Debug, type Villager } from './api'

type Rank = { id: string; villager: string; score: number }
type Influence = { pagerank: Rank[]; brokers: Rank[]; communities: { communityId: number; members: string[] }[] }
type Route = { route: string[]; ids: string[]; hops: number | null }

export default function Spymaster({ villagers, onDebug, onRoute }: {
  villagers: Villager[]; onDebug: (d?: Debug) => void; onRoute: (ids: string[]) => void
}) {
  const [inf, setInf] = useState<Influence | null>(null)
  const [start, setStart] = useState('pip')
  const [target, setTarget] = useState('ilsa')
  const [route, setRoute] = useState<Route | null>(null)
  const [question, setQuestion] = useState('How do I fix my reputation with Captain Ilsa?')
  const [plan, setPlan] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api<Influence>('/api/spymaster/influence').then(r => { setInf(r); onDebug(r.debug) }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const findRoute = async () => {
    const r = await api<Route>(`/api/spymaster/route?start=${start}&target=${target}`)
    setRoute(r); onDebug(r.debug); onRoute(r.ids)
  }
  const ask = async () => {
    setBusy(true)
    try {
      const r = await api<{ plan: string }>('/api/spymaster/ask', { question })
      setPlan(r.plan); onDebug(r.debug)
    } finally { setBusy(false) }
  }
  const max = inf ? Math.max(...inf.pagerank.map(p => p.score)) : 1
  const CLIQUE = ['the inn crowd', 'the chapel pair', 'loners']

  return (
    <section className="panel spymaster">
      <h2>🕵️ Spymaster</h2>
      <p className="hint">Graph algorithms over who trusts whom, run live in FalkorDB.</p>
      <h3>Most influential gossip <small>PageRank on TRUSTS</small></h3>
      {inf?.pagerank.map(p => (
        <div key={p.id} className="bar-row">
          <span>{p.villager}</span>
          <div className="bar"><div style={{ width: `${(p.score / max) * 100}%` }} /></div>
          <code>{p.score.toFixed(2)}</code>
        </div>
      ))}
      <h3>Cliques <small>WCC over strong trust</small></h3>
      <ul className="cliques">
        {inf?.communities.map((c, i) => (
          <li key={c.communityId}><b>{c.members.length > 1 ? CLIQUE[i] || 'a group' : 'on their own'}:</b> {c.members.join(', ')}</li>
        ))}
      </ul>
      <h3>Brokers <small>betweenness</small></h3>
      <p>{inf?.brokers.filter(b => b.score > 0).map(b => `${b.villager} (${b.score})`).join(' · ')}</p>
      <h3>Fastest rumour route <small>shortestPath</small></h3>
      <div className="row">
        Tell <select value={start} onChange={e => setStart(e.target.value)}>
          {villagers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        to reach <select value={target} onChange={e => setTarget(e.target.value)}>
          {villagers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <button onClick={findRoute}>Find</button>
      </div>
      {route && <p className="route">{route.hops == null ? 'No route: nobody would pass it on.' : `${route.route.join(' → ')} (${route.hops} hop${route.hops === 1 ? '' : 's'})`}</p>}
      <h3>Ask the spymaster</h3>
      <div className="row">
        <input value={question} onChange={e => setQuestion(e.target.value)} maxLength={300} aria-label="Question for the spymaster" />
        <button onClick={ask} disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </div>
      {plan && <p className="plan">{plan}</p>}
    </section>
  )
}
